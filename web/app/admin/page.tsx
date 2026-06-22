"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ScrollReveal";

const AdminCharts = dynamic(() => import("@/components/AdminCharts"), {
  ssr: false,
  loading: () => (
    <div className="border border-line bg-surface/50 p-6 h-[380px] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
    </div>
  ),
});

interface FullStats {
  total_users: number; online_users: number;
  new_today: number; new_this_week: number; new_this_month: number;
  total_orders: number; orders_today: number; orders_this_week: number; orders_this_month: number;
  pending_orders: number;
  total_revenue: number; revenue_today: number; revenue_this_week: number; revenue_this_month: number;
  total_expenses: number; expenses_today: number; expenses_this_week: number; expenses_this_month: number;
  net_profit: number; net_profit_today: number; net_profit_this_week: number; net_profit_this_month: number;
  db_connected: boolean;
  growth?: {
    revenue_week_pct: number; revenue_month_pct: number;
    users_week_pct: number; users_month_pct: number;
    orders_week_pct: number; orders_month_pct: number;
  };
  user_growth_chart?: { date: string; count: number }[];
}

interface AdminUser {
  id: string; telegram_id: number; username: string; name: string;
  is_admin: boolean; notify_new_drops: boolean; notify_promos: boolean;
  created_at: string; last_seen?: string;
}

interface Order {
  id: string; items: any; total: number; status: string;
  created_at: string; username?: string; name?: string; contact?: any;
}

interface Expense {
  id: string; category: string; description: string; amount: number; created_at: string;
}

interface Ticket {
  id: string; user_id: number;
  admin_messages: { admin_id: number; message_id: number }[];
  original_text: string; status: string; accepted_by: number | null;
  admin_name: string; created_at: string;
}

type Tab = "dashboard" | "orders" | "expenses" | "broadcast" | "notify" | "users" | "tickets";

function fmtPrice(kopecks: number) {
  return (kopecks / 100).toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " ₽";
}

function adminFetch(path: string, init?: RequestInit) {
  const headers: Record<string, string> = { ...(init?.headers as any) };
  if (init?.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  return fetch(path, { ...init, headers, credentials: "include" });
}

function GrowthBadge({ pct }: { pct?: number }) {
  if (pct === undefined || pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
      up ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
    }`}>
      {up ? "↑" : "↓"}{Math.abs(pct)}%
    </span>
  );
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
  // Фильтры заказов
  const [orderStatus, setOrderStatus] = useState("all");
  const [orderFrom, setOrderFrom] = useState("");
  const [orderTo, setOrderTo] = useState("");
  // SSE live уведомления
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const adminId = user?.telegram_id ?? 0;

  const fetchStats = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/full-stats");
      if (res.ok) { setStats(await res.json()); setApiError(""); }
      else setApiError("Не удалось загрузить статистику.");
    } catch { setApiError("Ошибка сети."); }
  }, []);

  const fetchUsers    = useCallback(async () => { try { const r = await adminFetch("/api/admin/users"); if (r.ok) setUsers(await r.json()); } catch {} }, []);
  const fetchOrders   = useCallback(async () => { try { const r = await adminFetch("/api/admin/recent-orders?limit=200"); if (r.ok) setOrders(await r.json()); } catch {} }, []);
  const fetchExpenses = useCallback(async () => { try { const r = await adminFetch("/api/admin/expenses"); if (r.ok) setExpenses(await r.json()); } catch {} }, []);
  const fetchTickets  = useCallback(async () => { try { const r = await adminFetch("/api/admin/tickets"); if (r.ok) setTickets(await r.json()); } catch {} }, []);

  const refreshAll = useCallback(async () => {
    setDataLoading(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchOrders(), fetchExpenses(), fetchTickets()]);
    setDataLoading(false);
  }, [fetchStats, fetchUsers, fetchOrders, fetchExpenses, fetchTickets]);

  // SSE подключение
  useEffect(() => {
    if (!user || !isAdmin) return;
    const es = new EventSource("/api/admin/events", { withCredentials: true });
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "new_order") {
          setLiveAlert(`📦 Новый заказ! Всего: ${data.total_orders}, ожидают: ${data.pending}`);
          fetchStats(); fetchOrders();
          setTimeout(() => setLiveAlert(null), 6000);
        }
        if (data.type === "new_ticket") {
          setLiveAlert(`🎫 Новое обращение! Открытых: ${data.open_tickets}`);
          fetchTickets();
          setTimeout(() => setLiveAlert(null), 6000);
        }
      } catch {}
    };
    return () => { es.close(); };
  }, [user, isAdmin, fetchStats, fetchOrders, fetchTickets]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    refreshAll();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user, isAdmin, refreshAll, fetchStats]);

  const handleBroadcast = async () => {
    if (!broadcastText.trim() || sending) return;
    setSending(true); setSentMsg("");
    try {
      const res = await adminFetch("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ text: broadcastText, target: broadcastTarget }),
      });
      setSentMsg(res.ok ? "✅ Рассылка поставлена в очередь" : "❌ Ошибка");
      if (res.ok) setBroadcastText("");
    } catch { setSentMsg("❌ Ошибка"); }
    setSending(false);
  };

  const handleNotify = async () => {
    if (!notifyText.trim() || sending) return;
    setSending(true); setSentMsg("");
    try {
      const res = await adminFetch("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ text: notifyText, target: "drops" }),
      });
      setSentMsg(res.ok ? "✅ Уведомление отправлено" : "❌ Ошибка");
      if (res.ok) setNotifyText("");
    } catch { setSentMsg("❌ Ошибка"); }
    setSending(false);
  };

  const handleAddExpense = async () => {
    const amount = parseInt(expenseAmount);
    if (!amount || amount <= 0 || sending) return;
    setSending(true);
    try {
      await adminFetch("/api/admin/expenses", {
        method: "POST",
        body: JSON.stringify({ category: expenseCat, description: expenseDesc, amount: amount * 100 }),
      });
      setExpenseDesc(""); setExpenseAmount("");
      await fetchExpenses(); await fetchStats();
    } catch {}
    setSending(false);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Удалить расход?")) return;
    try { await adminFetch(`/api/admin/expenses/${id}`, { method: "DELETE" }); await fetchExpenses(); await fetchStats(); } catch {}
  };

  const handleTakeTicket = async (ticketId: string) => {
    try {
      const res = await adminFetch(`/api/admin/tickets/${ticketId}/take`, {
        method: "POST",
        body: JSON.stringify({ admin_id: adminId, admin_name: user?.name || "Admin" }),
      });
      const data = await res.json();
      setSentMsg(data.ok || data.success ? "✅ Тикет взят в работу" : "❌ " + (data.error || "Ошибка"));
      await fetchTickets();
    } catch { setSentMsg("❌ Ошибка"); }
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
      setSentMsg(data.ok || data.success ? "✅ Ответ отправлен" : "❌ " + (data.error || "Ошибка"));
      setTicketReply((prev) => ({ ...prev, [ticketId]: "" }));
      await fetchTickets();
    } catch { setSentMsg("❌ Ошибка"); }
  };

  // Фильтрация заказов
  const filteredOrders = orders.filter((o) => {
    if (orderStatus !== "all" && o.status !== orderStatus) return false;
    if (orderFrom && new Date(o.created_at) < new Date(orderFrom)) return false;
    if (orderTo   && new Date(o.created_at) > new Date(orderTo + "T23:59:59")) return false;
    return true;
  });

  // CSV экспорт
  const exportCSV = () => {
    const params = new URLSearchParams();
    if (orderStatus !== "all") params.set("status", orderStatus);
    if (orderFrom) params.set("from", orderFrom);
    if (orderTo)   params.set("to",   orderTo);
    window.open(`/api/admin/orders/export?${params}`, "_blank");
  };

  if (loading) return (
    <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-6" />
      <p className="text-sm text-muted">Загрузка...</p>
    </div>
  );

  if (!user || !isAdmin) return (
    <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
      <ScrollReveal>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4915C" strokeWidth="2">
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

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "dashboard", label: "Дашборд", icon: "📊" },
    { id: "orders",    label: "Заказы",   icon: "📦" },
    { id: "expenses",  label: "Расходы",  icon: "💰" },
    { id: "broadcast", label: "Рассылка", icon: "📢" },
    { id: "notify",    label: "Дропы",    icon: "🔥" },
    { id: "users",     label: "Юзеры",    icon: "👥" },
    { id: "tickets",   label: "Тикеты",   icon: "🎫" },
  ];

  const catEmoji: Record<string, string> = { production: "🏭", shipping: "📦", marketing: "📢", other: "📁" };
  const statusColor: Record<string, string> = {
    pending: "text-yellow-500", paid: "text-green-500",
    shipped: "text-blue-500",   delivered: "text-accent", cancelled: "text-red-500",
  };

  return (
    <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">

        {/* SSE live уведомление */}
        {liveAlert && (
          <div className="fixed top-20 right-6 z-50 glass-strong border border-accent/30 px-5 py-3 text-sm font-bold text-accent animate-fade-in shadow-glow">
            {liveAlert}
          </div>
        )}

        <ScrollReveal>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-4">Админ</p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase">Панель управления</h1>
            </div>
            {stats && (
              <div className={`flex items-center gap-2 text-sm font-bold ${
                stats.online_users > 0 ? "text-green-500" : "text-muted"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  stats.online_users > 0 ? "bg-green-500 animate-pulse" : "bg-muted/50"
                }`} />
                {stats.online_users} онлайн
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal delay={100}>
          <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setSentMsg(""); }}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold tracking-wider uppercase whitespace-nowrap transition-all duration-200 ${
                  tab === t.id
                    ? "bg-accent text-bg"
                    : "bg-surface/50 border border-line text-muted hover:text-text hover:border-accent/30"
                }`}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {apiError && (
          <ScrollReveal>
            <div className="mt-8 border border-accent/20 bg-accent/5 p-6 text-center">
              <p className="text-sm text-accent font-bold mb-2">⚠️ {apiError}</p>
              <button onClick={() => { setApiError(""); refreshAll(); }} className="btn-primary text-xs mt-2">Повторить</button>
            </div>
          </ScrollReveal>
        )}

        {/* ==================== DASHBOARD ==================== */}
        {tab === "dashboard" && stats && (
          <div className="mt-8 space-y-3">
            <ScrollReveal delay={150}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card label="🟢 Онлайн" value={String(stats.online_users)} accent />
                <Card label="👥 Всего" value={String(stats.total_users)} />
                <Card label="📦 Заказов" value={String(stats.total_orders)} />
                <Card label="⏳ Pending" value={String(stats.pending_orders)} warning />
              </div>
            </ScrollReveal>

            {/* KPI с ростом */}
            <ScrollReveal delay={200}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CardKPI label="💰 Выручка неделя" value={fmtPrice(stats.revenue_this_week)} pct={stats.growth?.revenue_week_pct} />
                <CardKPI label="💰 Выручка месяц" value={fmtPrice(stats.revenue_this_month)} pct={stats.growth?.revenue_month_pct} />
                <CardKPI label="✨ Прибыль месяц" value={fmtPrice(stats.net_profit_this_month)} accent />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={230}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CardKPI label="👤 Новых неделя" value={String(stats.new_this_week)} pct={stats.growth?.users_week_pct} />
                <CardKPI label="👤 Новых месяц" value={String(stats.new_this_month)} pct={stats.growth?.users_month_pct} />
                <CardKPI label="📦 Заказов месяц" value={String(stats.orders_this_month)} pct={stats.growth?.orders_month_pct} />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={260}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card label="📉 Расходы сегодня" value={fmtPrice(stats.expenses_today)} warning />
                <Card label="📉 Расходы неделя" value={fmtPrice(stats.expenses_this_week)} />
                <Card label="📉 Расходы месяц" value={fmtPrice(stats.expenses_this_month)} />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={290}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card label="📤 Всего выручка" value={fmtPrice(stats.total_revenue)} accent />
                <Card label="📥 Всего расходы" value={fmtPrice(stats.total_expenses)} warning />
                <Card label="✨ Всего прибыль" value={fmtPrice(stats.net_profit)} accent />
                <Card label="🗄 БД" value={stats.db_connected ? "✅ Подключена" : "❌ Нет"} />
              </div>
            </ScrollReveal>
            <ScrollReveal delay={320}>
              <AdminCharts stats={stats} />
            </ScrollReveal>
          </div>
        )}

        {/* ==================== ORDERS ==================== */}
        {tab === "orders" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 space-y-4">
              {/* Фильтры */}
              <div className="border border-line bg-surface/50 p-4 flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-muted">Статус</label>
                  <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}
                    className="bg-transparent border border-line px-3 py-2 text-sm text-text focus:outline-none focus:border-accent">
                    <option value="all">Все</option>
                    <option value="pending">Ожидает</option>
                    <option value="paid">Оплачен</option>
                    <option value="shipped">Отправлен</option>
                    <option value="delivered">Доставлен</option>
                    <option value="cancelled">Отменён</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-muted">От</label>
                  <input type="date" value={orderFrom} onChange={(e) => setOrderFrom(e.target.value)}
                    className="bg-transparent border border-line px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-muted">До</label>
                  <input type="date" value={orderTo} onChange={(e) => setOrderTo(e.target.value)}
                    className="bg-transparent border border-line px-3 py-2 text-sm text-text focus:outline-none focus:border-accent" />
                </div>
                <button onClick={exportCSV} className="btn-outline text-xs px-4 py-2 ml-auto">
                  ↓ CSV
                </button>
              </div>

              <div className="border border-line bg-surface/50 p-6">
                <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">
                  Заказы ({filteredOrders.length})
                </h3>
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-muted text-center py-8">Нет заказов</p>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredOrders.map((o) => (
                      <div key={o.id} className="border border-line bg-bg/30 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-muted">#{o.id.slice(0, 8)}</span>
                          <span className={`text-xs font-bold uppercase ${statusColor[o.status] || "text-muted"}`}>{o.status}</span>
                        </div>
                        <div className="text-lg font-black text-accent">{fmtPrice(o.total)}</div>
                        <div className="text-[10px] text-muted mt-1">
                          {o.name || "—"} {o.username ? `@${o.username}` : ""} · {o.created_at ? new Date(o.created_at).toLocaleString("ru-RU") : "—"}
                        </div>
                        {/* Трекинг + смена статуса */}
                        <div className="mt-3 flex flex-wrap gap-2 items-center">
                          <select
                            defaultValue={o.status}
                            onChange={async (e) => {
                              await adminFetch(`/api/admin/orders/${o.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({ status: e.target.value }),
                              });
                              await fetchOrders();
                            }}
                            className="bg-transparent border border-line px-2 py-1 text-[10px] text-text focus:outline-none focus:border-accent">
                            {["pending","processing","paid","shipped","delivered","cancelled"].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Номер трекинга..."
                            defaultValue={(o as any).tracking_number || ""}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val === ((o as any).tracking_number || "")) return;
                              await adminFetch(`/api/admin/orders/${o.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({ tracking_number: val }),
                              });
                              await fetchOrders();
                            }}
                            className="flex-1 bg-transparent border border-line px-2 py-1 text-[10px] text-text placeholder:text-muted/40 focus:outline-none focus:border-accent min-w-[120px]"
                          />
                          <input
                            type="text"
                            placeholder="Перевозчик..."
                            defaultValue={(o as any).tracking_carrier || ""}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val === ((o as any).tracking_carrier || "")) return;
                              await adminFetch(`/api/admin/orders/${o.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({ tracking_carrier: val }),
                              });
                            }}
                            className="w-24 bg-transparent border border-line px-2 py-1 text-[10px] text-text placeholder:text-muted/40 focus:outline-none focus:border-accent"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ==================== EXPENSES ==================== */}
        {tab === "expenses" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-line bg-surface/50 p-6 mb-4">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Добавить расход</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <select value={expenseCat} onChange={(e) => setExpenseCat(e.target.value)}
                  className="bg-transparent border border-line px-4 py-3 text-sm text-text focus:outline-none focus:border-accent">
                  <option value="production">🏭 Производство</option>
                  <option value="shipping">📦 Доставка</option>
                  <option value="marketing">📢 Маркетинг</option>
                  <option value="other">📁 Другое</option>
                </select>
                <input type="text" value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Описание..."
                  className="bg-transparent border border-line px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent" />
                <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Сумма ₽"
                  className="bg-transparent border border-line px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent" />
              </div>
              <button onClick={handleAddExpense} disabled={sending || !expenseAmount} className="btn-primary w-full disabled:opacity-50">
                {sending ? "Добавление..." : "Добавить расход"}
              </button>
            </div>
            <div className="border border-line bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">История расходов ({expenses.length})</h3>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Пока нет расходов</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-3 border-b border-line last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{catEmoji[e.category] || "📁"}</span>
                        <div>
                          <div className="text-sm font-bold text-text">{e.description || "Без описания"}</div>
                          <div className="text-[10px] text-muted">{e.category} · {e.created_at ? new Date(e.created_at).toLocaleString("ru-RU") : "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-accent-warm">-{fmtPrice(e.amount)}</span>
                        <button onClick={() => handleDeleteExpense(e.id)} className="text-muted hover:text-accent text-xs transition-colors">✕</button>
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
            <div className="mt-8 border border-line bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Рассылка</h3>
              <textarea value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Текст рассылки..."
                className="w-full bg-transparent border border-line px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent min-h-[100px] resize-y mb-4" />
              <select value={broadcastTarget} onChange={(e) => setBroadcastTarget(e.target.value)}
                className="w-full bg-transparent border border-line px-4 py-3 text-sm text-text focus:outline-none focus:border-accent mb-4">
                <option value="all">Все пользователи</option>
                <option value="promos">Подписчики промо</option>
                <option value="drops">Подписчики дропов</option>
              </select>
              <button onClick={handleBroadcast} disabled={sending || !broadcastText.trim()} className="btn-primary w-full disabled:opacity-50">
                {sending ? "Отправка..." : "Отправить рассылку"}
              </button>
              {sentMsg && <p className="mt-3 text-sm text-center text-accent">{sentMsg}</p>}
            </div>
          </ScrollReveal>
        )}

        {/* ==================== NOTIFY ==================== */}
        {tab === "notify" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-line bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Уведомление о дропе</h3>
              <textarea value={notifyText} onChange={(e) => setNotifyText(e.target.value)}
                placeholder="🔥 Новый дроп! SOULDAWN x ..."
                className="w-full bg-transparent border border-line px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent min-h-[100px] resize-y mb-4" />
              <button onClick={handleNotify} disabled={sending || !notifyText.trim()} className="btn-primary w-full disabled:opacity-50">
                {sending ? "Отправка..." : "Отправить уведомление"}
              </button>
              {sentMsg && <p className="mt-3 text-sm text-center text-accent">{sentMsg}</p>}
            </div>
          </ScrollReveal>
        )}

        {/* ==================== USERS ==================== */}
        {tab === "users" && (
          <ScrollReveal delay={200}>
            <div className="mt-8 border border-line bg-surface/50 p-6">
              <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Пользователи ({users.length})</h3>
              {users.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">Нет пользователей</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {users.map((u) => {
                    const isOnline = u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) < 120000;
                    return (
                      <div key={u.id} className="flex items-center justify-between py-3 border-b border-line last:border-0">
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
                          {u.notify_promos    && <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/20 text-blue-500 font-bold">📢</span>}
                          {u.is_admin         && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 font-bold">⚡</span>}
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
            <div className="mt-8 border border-line bg-surface/50 p-6">
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
                      open: "text-accent", in_progress: "text-green-500",
                      answered: "text-blue-500", closed: "text-muted",
                    };
                    const statusLabels: Record<string, string> = {
                      open: "НОВЫЙ", in_progress: "В РАБОТЕ",
                      answered: "ОТВЕЧЕНО", closed: "ЗАКРЫТ",
                    };
                    const isOpen   = t.status === "open";
                    const isTaken  = t.status === "in_progress";
                    const lines    = (t.original_text || "").split("\n").filter((l: string) => l.trim());
                    const userName = lines.find((l: string) => l.includes("👤")) || "User";
                    const msgLine  = lines.find((l: string) => l.includes("«")) || "";
                    const msg      = msgLine.replace("📝 Сообщение:", "").replace("«", "").replace("»", "").trim();
                    return (
                      <div key={t.id} className={`border p-4 ${
                        isTaken ? "border-green-500/20 bg-green-500/5" : "border-line"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-text">{userName}</span>
                          <span className={`text-[10px] font-bold uppercase ${statusColors[t.status] || "text-muted"}`}>
                            {statusLabels[t.status] || t.status}
                          </span>
                        </div>
                        <p className="text-sm text-text mb-2">{msg || t.original_text || "Обращение"}</p>
                        <div className="text-[10px] text-muted mb-3">
                          {t.created_at ? new Date(t.created_at).toLocaleString("ru-RU") : "—"}
                          {t.admin_name && ` · 👤 ${t.admin_name}`}
                        </div>
                        {isOpen && (
                          <button onClick={() => handleTakeTicket(t.id)} className="btn-primary text-xs w-full">
                            📥 Взять в работу
                          </button>
                        )}
                        {isTaken && (
                          <div className="flex gap-2">
                            <input type="text" value={ticketReply[t.id] || ""}
                              onChange={(e) => setTicketReply((prev) => ({ ...prev, [t.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") handleReplyTicket(t.id); }}
                              placeholder="Текст ответа..."
                              className="flex-1 bg-transparent border border-line px-3 py-2 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent" />
                            <button onClick={() => handleReplyTicket(t.id)} className="btn-primary text-xs px-4">→</button>
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
    <div className="border border-line bg-surface/50 p-4 text-center">
      <div className={`text-xl md:text-2xl font-black ${
        accent ? "text-accent" : warning ? "text-accent-warm" : "text-text"
      }`}>{value}</div>
      <div className="text-[9px] font-bold tracking-widest uppercase text-muted mt-1">{label}</div>
    </div>
  );
}

function CardKPI({ label, value, pct, accent }: { label: string; value: string; pct?: number; accent?: boolean }) {
  return (
    <div className="border border-line bg-surface/50 p-4">
      <div className="flex items-start justify-between mb-1">
        <div className={`text-xl md:text-2xl font-black ${
          accent ? "text-accent" : "text-text"
        }`}>{value}</div>
        <GrowthBadge pct={pct} />
      </div>
      <div className="text-[9px] font-bold tracking-widest uppercase text-muted">{label}</div>
    </div>
  );
}

function GrowthBadge({ pct }: { pct?: number }) {
  if (pct === undefined || pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
      up ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
    }`}>
      {up ? "↑" : "↓"}{Math.abs(pct)}%
    </span>
  );
}
