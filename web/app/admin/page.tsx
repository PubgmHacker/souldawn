"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ScrollReveal";

// Recharts завязан на window — грузим только на клиенте (без SSR).
const AdminCharts = dynamic(() => import("@/components/AdminCharts"), {
  ssr: false,
  loading: () => (
    <div className="border border-white/5 bg-surface/50 p-6 h-[380px] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  ),
});

interface FullStats {
  total_users: number;
  online_users: number;
  new_today: number;
  new_this_week: number;
  new_this_month: number;
  total_orders: number;
  orders_today: number;
  orders_this_week: number;
  orders_this_month: number;
  pending_orders: number;
  total_revenue: number;
  revenue_today: number;
  revenue_this_week: number;
  revenue_this_month: number;
  total_expenses: number;
  expenses_today: number;
  expenses_this_week: number;
  expenses_this_month: number;
  net_profit: number;
  net_profit_today: number;
  net_profit_this_week: number;
  net_profit_this_month: number;
  db_connected: boolean;
}

interface AdminUser {
  id: string;
  telegram_id: number;
  username: string;
  name: string;
  is_admin: boolean;
  notify_new_drops: boolean;
  notify_promos: boolean;
  created_at: string;
  last_seen?: string;
}

interface Order {
  id: string;
  items: any;
  total: number;
  status: string;
  created_at: string;
  username?: string;
  name?: string;
  contact?: any;
}

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  created_at: string;
}

interface Ticket {
  id: string;
  user_id: number;
  admin_messages: { admin_id: number; message_id: number }[];
  original_text: string;
  status: string;
  accepted_by: number | null;
  admin_name: string;
  created_at: string;
}

type Tab = "dashboard" | "orders" | "expenses" | "broadcast" | "notify" | "users" | "tickets";

function fmtPrice(kopecks: number) {
  return (kopecks / 100).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

// Авторизация идёт по httpOnly-куке sd_access_token (серверная проверка роли).
function adminFetch(path: string, init?: RequestInit) {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return fetch(path, { ...init, headers, credentials: "include" });
}

export default function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<FullStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [notifyText, setNotifyText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [expenseCat, setExpenseCat] = useState("other");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketReply, setTicketReply] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  const adminId = user?.telegram_id ?? 0;

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/full-stats");
      if (res.ok) {
        setStats(await res.json());
        setApiError("");
      } else {
        setApiError("Не удалось загрузить статистику.");
      }
    } catch {
      setApiError("Ошибка сети при загрузке статистики.");
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/users");
      if (res.ok) setUsers(await res.json());
    } catch {}
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/recent-orders?limit=100");
      if (res.ok) setOrders(await res.json());
    } catch {}
  }, []);

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/expenses");
      if (res.ok) setExpenses(await res.json());
    } catch {}
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/tickets");
      if (res.ok) setTickets(await res.json());
    } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    setDataLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchOrders(), fetchExpenses(), fetchTickets()]);
    setDataLoading(false);
  }, [fetchStats, fetchUsers, fetchOrders, fetchExpenses, fetchTickets]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    refreshAll();
    const interval = setInterval(() => { fetchStats(); }, 30000);
    return () => clearInterval(interval);
  }, [user, isAdmin, refreshAll, fetchStats]);

  const handleBroadcast = async () => {
    if (!broadcastText.trim() || sending || !adminId) return;
    setSending(true);
    setSentMsg("");
    try {
      const res = await adminFetch("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ text: broadcastText, target: broadcastTarget }),
      });
      if (res.ok) {
        setSentMsg("✅ Рассылка поставлена в очередь (бот разошлёт)");
        setBroadcastText("");
      } else {
        setSentMsg("❌ Ошибка при отправке");
      }
    } catch {
      setSentMsg("❌ Ошибка при отправке");
    }
    setSending(false);
  };

  const handleNotify = async () => {
    if (!notifyText.trim() || sending || !adminId) return;
    setSending(true);
    setSentMsg("");
    try {
      const res = await adminFetch("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ text: notifyText, target: "drops" }),
      });
      if (res.ok) {
        setSentMsg("✅ Уведомление о дропе поставлено в очередь");
        setNotifyText("");
      } else {
        setSentMsg("❌ Ошибка при отправке");
      }
    } catch {
      setSentMsg("❌ Ошибка при отправке");
    }
    setSending(false);
  };

  const handleAddExpense = async () => {
    const amount = parseInt(expenseAmount);
    if (!amount || amount <= 0 || sending) return;
    setSending(true);
    try {
      // amount в рублях → копейки для хранения.
      await adminFetch("/api/admin/expenses", {
        method: "POST",
        body: JSON.stringify({ category: expenseCat, description: expenseDesc, amount: amount * 100 }),
      });
      setExpenseDesc("");
      setExpenseAmount("");
      await fetchExpenses();
      await fetchStats();
    } catch {}
    setSending(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Удалить расход?")) return;
    try {
      await adminFetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
      await fetchExpenses();
      await fetchStats();
    } catch {}
  };

  const handleTakeTicket = async (ticketId: string) => {
    try {
      const res = await adminFetch(`/api/admin/tickets/${ticketId}/take`, {
        method: "POST",
        body: JSON.stringify({ admin_id: adminId, admin_name: user?.name || "Admin" }),
      });
      const data = await res.json();
      if (data.ok || data.success) {
        setSentMsg("✅ Тикет взят в работу");
        await fetchTickets();
      } else {
        setSentMsg("❌ " + (data.error || "Не удалось взять тикет"));
      }
    } catch {
      setSentMsg("❌ Ошибка при взятии тикета");
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    const text = ticketReply[ticketId]?.trim();
    if (!text) return;
    try {
      const res = await adminFetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        body: JSON.stringify({ text, admin_name: user?.name || "Admin" }),
      });
      const data = await res.json();
      if (data.ok || data.success) {
        setSentMsg("✅ Ответ отправлен");
        setTicketReply((prev) => ({ ...prev, [ticketId]: "" }));
        await fetchTickets();
      } else {
        setSentMsg("❌ " + (data.error || "Не удалось отправить"));
      }
    } catch {
      setSentMsg("❌ Ошибка при отправке");
    }
  };

  if (loading) {
    return (
      <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-6" />
        <p className="text-sm text-muted">Загрузка...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
        <ScrollReveal>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B2500" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">Нет доступа</h1>
            <p className="text-sm text-muted mb-8">Эта страница доступна только администраторам.</p>
            <Link href="/profile" className="btn-primary">Мой профиль</Link>
          </div>
        </ScrollReveal>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Дашборд", icon: "📊" },
    { id: "orders", label: "Заказы", icon: "📦" },
    { id: "expenses", label: "Расходы", icon: "💰" },
    { id: "broadcast", label: "Рассылка", icon: "📢" },
    { id: "notify", label: "Дропы", icon: "🔥" },
    { id: "users", label: "Юзеры", icon: "👥" },
    { id: "tickets", label: "Тикеты", icon: "🎫" },
  ];

  const catEmoji: Record<string, string> = { production: "🏭", shipping: "📦", marketing: "📢", other: "📁" };
  const statusColor: Record<string, string> = {
    pending: "text-yellow-500",
    paid: "text-green-500",
    shipped: "text-blue-500",
    delivered: "text-accent",
    cancelled: "text-red-500",
  };

  return (
    <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">
        <ScrollReveal>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-4">Админ</p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase">Панель управления</h1>
            </div>
            {stats && (
              <div className={`flex items-center gap-2 text-sm font-bold ${stats.online_users > 0 ? "text-green-500" : "text-muted"}`}>
                <span className={`w-2 h-2 rounded-full ${stats.online_users > 0 ? "bg-green-500 animate-pulse" : "bg-muted/50"}`} />
                {stats.online_users} онлайн
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal delay={100}>
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSentMsg(""); }}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 ${
                  tab === t.id
                    ? "bg-accent text-bg"
                    : "bg-surface/50 border border-white/10 text-muted hover:text-text hover:border-white/20"
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ==================== ERROR BANNER ==================== */}
        {apiError && (
          <ScrollReveal>
            <div className="mt-8 border border-accent-red/20 bg-accent-red/5 p-6 text-center">
              <p className="text-sm text-accent-red font-bold mb-2">⚠️ {apiError}</p>
              <button onClick={() => { setApiError(""); setDataLoading(true); setTimeout(() => { fetchStats(); setDataLoading(false); }, 1000); }}
                className="btn-primary text-xs mt-2">
                Повторить
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* ==================== DASHBOARD ==================== */}
        {tab === "dashboard" && stats && (
          <div className="mt-8">
            <ScrollReveal delay={150}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <Card label="🟢 Онлайн" value={String(stats.online_users)} accent />
                <Card label="👥 Всего" value={String(stats.total_users)} />
                <Card label="📦 Заказов" value={String(stats.total_orders)} />
                <Card label="⏳ Pending" value={String(stats.pending_orders)} warning />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={200}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <Card label="💰 Выручка сегодня" value={fmtPrice(stats.revenue_today)} accent />
                <Card label="💰 За неделю" value={fmtPrice(stats.revenue_this_week)} />
                <Card label="💰 За месяц" value={fmtPrice(stats.revenue_this_month)} />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={250}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <Card label="📉 Расходы сегодня" value={fmtPrice(stats.expenses_today)} warning />
                <Card label="📉 За неделю" value={fmtPrice(stats.expenses_this_week)} />
                <Card label="📉 За месяц" value={fmtPrice(stats.expenses_this_month)} />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={300}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <Card label="✨ Прибыль сегодня" value={fmtPrice(stats.net_profit_today)} accent />
                <Card label="✨ За неделю" value={fmtPrice(stats.net_profit_this_week)} />
                <Card label="✨ За месяц" value={fmtPrice(stats.net_profit_this_month)} />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={350}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <Card label="👤 Новых сегодня" value={String(stats.new_today)} />
                <Card label="👤 Новых за неделю" value={String(stats.new_this_week)} />
                <Card label="👤 Новых за месяц" value={String(stats.new_this_month)} />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={400}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <Card label="📤 Всего выручка" value={fmtPrice(stats.total_revenue)} accent />
                <Card label="📥 Всего расходы" value={fmtPrice(stats.total_expenses)} warning />
                <Card label="✨ Всего прибыль" value={fmtPrice(stats.net_profit)} accent />
                <Card label="🗄 БД" value={stats.db_connected ? "✅ Подключена" : "❌ Нет"} />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={450}>
              <AdminCharts stats={stats} />
            </ScrollReveal>
          </div>
        )}

        {/* ==================== ORDERS ==================== */}
        {tab === "orders" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-white/5 bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Последние заказы ({orders.length})</h3>
              {orders.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Нет заказов</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {orders.map((o) => (
                    <div key={o.id} className="border border-white/5 bg-bg/30 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-muted">#{o.id.slice(0, 8)}</span>
                        <span className={`text-xs font-bold uppercase ${statusColor[o.status] || "text-muted"}`}>{o.status}</span>
                      </div>
                      <div className="text-lg font-black text-accent">{fmtPrice(o.total)}</div>
                      <div className="text-[10px] text-muted mt-1">
                        {o.name || "—"} {o.username ? `@${o.username}` : ""} · {o.created_at ? new Date(o.created_at).toLocaleString("ru-RU") : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* ==================== EXPENSES ==================== */}
        {tab === "expenses" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-white/5 bg-surface/50 p-6 mb-4">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Добавить расход</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <select value={expenseCat} onChange={(e) => setExpenseCat(e.target.value)}
                  className="bg-transparent border border-white/10 px-4 py-3 text-sm text-text focus:outline-none focus:border-accent transition-colors">
                  <option value="production">🏭 Производство</option>
                  <option value="shipping">📦 Доставка</option>
                  <option value="marketing">📢 Маркетинг</option>
                  <option value="other">📁 Другое</option>
                </select>
                <input type="text" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Описание..."
                  className="bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors" />
                <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Сумма ₽"
                  className="bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors" />
              </div>
              <button onClick={handleAddExpense} disabled={sending || !expenseAmount}
                className="btn-primary w-full disabled:opacity-50">
                {sending ? "Добавление..." : "Добавить расход"}
              </button>
            </div>
            <div className="border border-white/5 bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">История расходов ({expenses.length})</h3>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Пока нет расходов</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{catEmoji[e.category] || "📁"}</span>
                        <div>
                          <div className="text-sm font-bold text-text">{e.description || "Без описания"}</div>
                          <div className="text-[10px] text-muted">
                            {e.category} · {e.created_at ? new Date(e.created_at).toLocaleString("ru-RU") : "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-accent-red">-{fmtPrice(e.amount)}</span>
                        <button onClick={() => handleDeleteExpense(e.id)}
                          className="text-muted hover:text-accent-red text-xs transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* ==================== BROADCAST ==================== */}
        {tab === "broadcast" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-white/5 bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Рассылка</h3>
              <textarea value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Текст рассылки..."
                className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300 min-h-[100px] resize-y mb-4" />
              <select value={broadcastTarget} onChange={(e) => setBroadcastTarget(e.target.value)}
                className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text focus:outline-none focus:border-accent transition-colors duration-300 mb-4">
                <option value="all">Все пользователи</option>
                <option value="promos">Подписчики промо</option>
                <option value="drops">Подписчики дропов</option>
              </select>
              <button onClick={handleBroadcast} disabled={sending || !broadcastText.trim()}
                className="btn-primary w-full disabled:opacity-50">
                {sending ? "Отправка..." : "Отправить рассылку"}
              </button>
              {sentMsg && <p className="mt-3 text-sm text-center text-accent">{sentMsg}</p>}
            </div>
          </ScrollReveal>
        )}

        {/* ==================== NOTIFY ==================== */}
        {tab === "notify" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-white/5 bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Уведомление о дропе</h3>
              <textarea value={notifyText} onChange={(e) => setNotifyText(e.target.value)}
                placeholder="🔥 Новый дроп! SOULDAWN x ..."
                className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300 min-h-[100px] resize-y mb-4" />
              <button onClick={handleNotify} disabled={sending || !notifyText.trim()}
                className="btn-primary w-full disabled:opacity-50">
                {sending ? "Отправка..." : "Отправить уведомление"}
              </button>
              {sentMsg && <p className="mt-3 text-sm text-center text-accent">{sentMsg}</p>}
            </div>
          </ScrollReveal>
        )}

        {/* ==================== USERS ==================== */}
        {tab === "users" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-white/5 bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Пользователи ({users.length})</h3>
              {users.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Нет пользователей</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {users.map((u) => {
                    const isOnline = u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) < 120000;
                    return (
                      <div key={u.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isOnline ? "bg-green-500/20 border border-green-500/30 text-green-500" : "bg-accent/20 border border-accent/30 text-accent"
                          }`}>
                            {(u.username || u.name || "S")[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-text">
                              {u.name || "—"} {u.username && <span className="text-muted font-normal">@{u.username}</span>}
                            </div>
                            <div className="text-[10px] text-muted">
                              ID: {u.telegram_id} · {u.created_at ? new Date(u.created_at).toLocaleDateString("ru-RU") : "—"}
                              {isOnline && <span className="text-green-500 ml-2">● онлайн</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {u.notify_new_drops && <span className="text-[9px] px-1.5 py-0.5 bg-accent/20 text-accent font-bold">🔥</span>}
                          {u.notify_promos && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-500 font-bold">📢</span>}
                          {u.is_admin && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 font-bold">⚡</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollReveal>
        )}

        {/* ==================== TICKETS ==================== */}
        {tab === "tickets" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-white/5 bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">
                Тикеты поддержки ({tickets.length})
              </h3>
              {sentMsg && <p className="mb-4 text-sm text-center text-accent">{sentMsg}</p>}
              {tickets.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Нет активных тикетов</p>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {tickets.map((t) => {
                    const statusColors: Record<string, string> = {
                      open: "text-accent",
                      in_progress: "text-green-500",
                      answered: "text-blue-500",
                      closed: "text-muted",
                    };
                    const statusLabels: Record<string, string> = {
                      open: "НОВЫЙ",
                      in_progress: "В РАБОТЕ",
                      answered: "ОТВЕЧЕНО",
                      closed: "ЗАКРЫТ",
                    };
                    const isOpen = t.status === "open";
                    const isTaken = t.status === "in_progress";
                    const lines = (t.original_text || "").split("\n").filter((l: string) => l.trim());
                    const userName = lines.find((l: string) => l.includes("👤")) || "User";
                    const msgLine = lines.find((l: string) => l.includes("«")) || "";
                    const msg = msgLine.replace("📝 Сообщение:", "").replace("«", "").replace("»", "").trim();

                    return (
                      <div key={t.id} className={`border p-4 ${isTaken ? "border-green-500/20 bg-green-500/5" : "border-white/5"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-text">{userName}</span>
                          <span className={`text-[10px] font-bold uppercase ${statusColors[t.status] || "text-muted"}`}>
                            {statusLabels[t.status] || t.status}
                          </span>
                        </div>
                        <p className="text-sm text-text mb-2">{msg || t.original_text || "Обращение в поддержку"}</p>
                        <div className="text-[10px] text-muted mb-3">
                          {t.created_at ? new Date(t.created_at).toLocaleString("ru-RU") : "—"}
                          {t.admin_name && ` · 👤 ${t.admin_name}`}
                        </div>
                        {isOpen && (
                          <button onClick={() => handleTakeTicket(t.id)}
                            className="btn-primary text-xs w-full">
                            📥 Взять в работу
                          </button>
                        )}
                        {isTaken && (
                          <div className="flex gap-2">
                            <input type="text" value={ticketReply[t.id] || ""}
                              onChange={(e) => setTicketReply((prev) => ({ ...prev, [t.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") handleReplyTicket(t.id); }}
                              placeholder="Текст ответа..."
                              className="flex-1 bg-transparent border border-white/10 px-3 py-2 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent" />
                            <button onClick={() => handleReplyTicket(t.id)}
                              className="btn-primary text-xs px-4">
                              →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, accent, warning }: { label: string; value: string; accent?: boolean; warning?: boolean }) {
  return (
    <div className="border border-white/5 bg-surface/50 p-4 text-center">
      <div className={`text-xl md:text-2xl font-black ${accent ? "text-accent" : warning ? "text-accent-red" : "text-text"}`}>
        {value}
      </div>
      <div className="text-[9px] font-bold tracking-widest uppercase text-muted mt-1">{label}</div>
    </div>
  );
}
