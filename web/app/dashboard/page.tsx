"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useAuth, formatPrice } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import ScrollReveal from "@/components/ScrollReveal";

// Статусы заказа
const STATUS_STEPS = ["pending", "paid", "shipped", "delivered"];

const STATUS_LABEL: Record<string, string> = {
  pending:    "Ожидает оплаты",
  processing: "Обработка",
  paid:       "Оплачен",
  shipped:    "Отправлен",
  delivered:  "Доставлен ✅",
  cancelled:  "Отменён ❌",
};

const STATUS_COLOR: Record<string, string> = {
  pending:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  processing: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  paid:       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  shipped:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
  delivered:  "bg-accent/10 text-accent border-accent/20",
  cancelled:  "bg-red-500/10 text-red-400 border-red-500/20",
};

// Прогресс-бар доставки
function DeliveryProgress({ status }: { status: string }) {
  if (status === "cancelled") return null;
  const idx = STATUS_STEPS.indexOf(status);
  if (idx < 0) return null;
  const steps = [
    { key: "pending",   label: "Заказ",    icon: "📝" },
    { key: "paid",      label: "Оплата",   icon: "💳" },
    { key: "shipped",   label: "В пути",   icon: "🚚" },
    { key: "delivered", label: "Доставлен", icon: "🎁" },
  ];
  return (
    <div className="mt-4 pt-4 border-t border-line">
      <div className="flex items-center justify-between relative">
        {/* Линия прогресса */}
        <div className="absolute left-0 right-0 top-4 h-[2px] bg-line z-0" />
        <div
          className="absolute left-0 top-4 h-[2px] bg-accent z-0 transition-all duration-700"
          style={{ width: `${(idx / (steps.length - 1)) * 100}%` }}
        />
        {steps.map((s, i) => {
          const done    = i <= idx;
          const current = i === idx;
          return (
            <div key={s.key} className="flex flex-col items-center gap-1 z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                done
                  ? "bg-accent border-accent text-bg"
                  : "bg-surface border-line text-muted"
              } ${current ? "ring-2 ring-accent/40" : ""}`}>
                {s.icon}
              </div>
              <span className={`text-[9px] font-bold tracking-wide ${
                done ? "text-accent" : "text-muted"
              }`}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, orders, isAdmin, logout, updateProfile, refreshUser } = useAuth();
  const { addItem } = useCart();
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "profile">("overview");
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);

  // Редактирование профиля
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [verifySending, setVerifySending] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  if (!user) return null;

  const filtered      = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const totalSpent    = orders.reduce((s, o) => s + (o.total || 0), 0);
  const activeOrders  = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

  const startEdit = () => {
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setSaveMsg(null);
  };

  const handleNotify = async (key: "notify_new_drops" | "notify_promos" | "notify_email", val: boolean) => {
    await updateProfile({ [key]: val });
  };

  const handleSendVerification = async () => {
    const target = (editEmail || user.email || "").trim();
    if (!target) { setVerifyMsg({ ok: false, text: "Сначала укажи email" }); return; }
    setVerifySending(true); setVerifyMsg(null);
    try {
      const res = await fetch("/api/auth/email/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      setVerifyMsg(res.ok
        ? { ok: true,  text: data.message || "Письмо отправлено" }
        : { ok: false, text: data.error  || "Не удалось отправить" }
      );
    } catch { setVerifyMsg({ ok: false, text: "Ошибка сети" }); }
    finally { setVerifySending(false); }
  };

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null);
    const res = await updateProfile({ name: editName, email: editEmail || null });
    setSaving(false);
    setSaveMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Сохранено" });
  };

  // Повторить заказ одним кликом
  const handleReorder = useCallback((order: typeof orders[0]) => {
    const items = order.items || [];
    if (!items.length) return;
    items.forEach((item) => {
      // Создаём минимальный Product-объект для CartContext
      const product = {
        id:          item.id || item.name,
        slug:        item.id || item.name,
        name:        item.name,
        description: "",
        priceKopecks: item.price,
        images:      [],
        sizes:       item.size ? [item.size] : [],
        isActive:    true,
        stock:       99,
      } as any;
      for (let i = 0; i < (item.qty || 1); i++) {
        addItem(product, item.size || "");
      }
    });
    setReorderMsg("✅ Товары добавлены в корзину");
    setTimeout(() => setReorderMsg(null), 3000);
  }, [addItem]);

  return (
    <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">

        {/* Reorder toast */}
        {reorderMsg && (
          <div className="fixed top-20 right-6 z-50 glass-strong border border-accent/30 px-5 py-3 text-sm font-bold text-accent animate-fade-in">
            {reorderMsg}
          </div>
        )}

        {/* Header */}
        <ScrollReveal>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-4">Личный кабинет</p>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight uppercase">Добро пожаловать!</h1>
              <p className="text-sm text-muted mt-3">{user.name || user.username || user.email || "Пользователь"}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Link href="/collection" className="btn-primary text-xs">🛍️ Каталог</Link>
              {isAdmin && <Link href="/admin" className="btn-outline text-xs">👑 Админ</Link>}
            </div>
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal delay={100}>
          <div className="mt-8 flex gap-2 border-b border-line">
            {(["overview", "orders", "profile"] as const).map((tab) => (
              <button key={tab}
                onClick={() => { setActiveTab(tab); if (tab === "profile") startEdit(); }}
                className={`px-4 py-3 text-xs font-bold tracking-wider uppercase transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-accent text-accent"
                    : "text-muted hover:text-text"
                }`}>
                {tab === "overview" ? "📊 Обзор" : tab === "orders" ? "📦 Заказы" : "👤 Профиль"}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div className="mt-8 space-y-6">
            <ScrollReveal delay={150}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="ingot rounded-xl p-6">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Всего заказов</p>
                  <p className="text-3xl font-black text-accent">{orders.length}</p>
                </div>
                <div className="ingot rounded-xl p-6">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Активных</p>
                  <p className="text-3xl font-black">{activeOrders}</p>
                </div>
                <div className="ingot rounded-xl p-6">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Доставлено</p>
                  <p className="text-3xl font-black text-accent">{deliveredOrders}</p>
                </div>
                <div className="ingot rounded-xl p-6">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Потрачено</p>
                  <p className="text-2xl font-black">{formatPrice(totalSpent)} ₽</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Активные заказы с трекингом */}
            {orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length > 0 && (
              <ScrollReveal delay={200}>
                <div className="ingot rounded-xl p-6">
                  <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Активные заказы</h3>
                  <div className="space-y-6">
                    {orders
                      .filter((o) => !["delivered", "cancelled"].includes(o.status))
                      .slice(0, 3)
                      .map((order) => (
                        <div key={order.id}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-text">#{order.id.slice(0, 8)}</span>
                            <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-1 border rounded ${
                              STATUS_COLOR[order.status] || "bg-white/10 text-white border-white/20"
                            }`}>
                              {STATUS_LABEL[order.status] || order.status}
                            </span>
                          </div>
                          <DeliveryProgress status={order.status} />
                          {(order as any).tracking_number && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[10px] text-muted">Трекинг:</span>
                              <span className="text-[10px] font-mono text-accent">
                                {(order as any).tracking_carrier && `${(order as any).tracking_carrier} · `}
                                {(order as any).tracking_number}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </ScrollReveal>
            )}

            <ScrollReveal delay={250}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/collection" className="ingot rounded-xl p-6 hover:border-accent/40 transition-colors hover-lift">
                  <div className="text-3xl mb-3">👕</div>
                  <h3 className="text-sm font-bold">Смотреть каталог</h3>
                  <p className="text-[10px] text-muted mt-1">Все новые товары</p>
                </Link>
                <Link href="/cart" className="ingot rounded-xl p-6 hover:border-accent/40 transition-colors hover-lift">
                  <div className="text-3xl mb-3">🛒</div>
                  <h3 className="text-sm font-bold">Моя корзина</h3>
                  <p className="text-[10px] text-muted mt-1">Оформить покупку</p>
                </Link>
                <a href="https://t.me/souldawn_support_bot" target="_blank" rel="noopener noreferrer"
                  className="ingot rounded-xl p-6 hover:border-accent/40 transition-colors hover-lift">
                  <div className="text-3xl mb-3">💬</div>
                  <h3 className="text-sm font-bold">Написать нам</h3>
                  <p className="text-[10px] text-muted mt-1">Техподдержка</p>
                </a>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ORDERS */}
        {activeTab === "orders" && (
          <ScrollReveal delay={150}>
            <div className="mt-8 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {["all", "pending", "paid", "shipped", "delivered", "cancelled"].map((s) => (
                  <button key={s} onClick={() => setFilter(s)}
                    className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 border rounded transition-all ${
                      filter === s
                        ? "border-accent text-accent bg-accent/10"
                        : "border-line text-muted hover:border-accent/30"
                    }`}>
                    {s === "all" ? "Все" : STATUS_LABEL[s] || s}
                  </button>
                ))}
              </div>

              <div className="border border-line bg-surface/50 p-6">
                {filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-muted mb-4">
                      {filter === "all" ? "Заказов пока нет" : "Нет заказов с этим статусом"}
                    </p>
                    <Link href="/collection" className="btn-primary text-xs">Перейти в каталог</Link>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[700px] overflow-y-auto">
                    {filtered.map((order) => (
                      <div key={order.id} className="border border-line bg-bg/30 p-5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-bold">#{order.id.slice(0, 8)}</p>
                            {order.created_at && (
                              <p className="text-[10px] text-muted mt-0.5">
                                {new Date(order.created_at).toLocaleDateString("ru-RU", {
                                  year: "numeric", month: "long", day: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 border rounded ${
                            STATUS_COLOR[order.status] || "bg-white/10 text-white border-white/20"
                          }`}>
                            {STATUS_LABEL[order.status] || order.status}
                          </span>
                        </div>

                        {/* Товары */}
                        <div className="space-y-1 mb-3 pb-3 border-b border-line">
                          {(order.items || []).map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-text">
                                {item.name} ×{item.qty}
                                {item.size && <span className="text-[10px] text-muted ml-1">{item.size}</span>}
                              </span>
                              <span className="text-muted">{formatPrice(item.price)} ₽</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] text-muted">Итого</span>
                          <span className="text-lg font-black text-accent">{formatPrice(order.total)} ₽</span>
                        </div>

                        {/* Трекинг */}
                        {(order as any).tracking_number && (
                          <div className="mb-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded">
                            <p className="text-[10px] font-bold text-blue-400 mb-1">📦 Номер отслеживания</p>
                            <p className="text-xs font-mono text-text">
                              {(order as any).tracking_carrier && (
                                <span className="text-muted mr-2">{(order as any).tracking_carrier}</span>
                              )}
                              {(order as any).tracking_number}
                            </p>
                          </div>
                        )}

                        {/* Прогресс доставки */}
                        <DeliveryProgress status={order.status} />

                        {/* Повторить заказ */}
                        {order.status === "delivered" && (
                          <button
                            onClick={() => handleReorder(order)}
                            className="mt-4 btn-outline text-xs w-full"
                          >
                            🔄 Повторить заказ
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* PROFILE */}
        {activeTab === "profile" && (
          <ScrollReveal delay={150}>
            <div className="mt-8 space-y-6">
              <div className="ingot rounded-xl p-6">
                <h3 className="text-xs font-bold tracking-widest uppercase text-accent mb-6">Информация профиля</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2 block">Имя</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-bg border border-line px-4 py-3 text-sm text-text focus:outline-none focus:border-accent transition-colors" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2 flex items-center gap-2">
                      Email
                      {user.email && user.email_verified && <span className="text-[10px] font-bold text-green-400 normal-case">✅ Привязан</span>}
                      {user.email && !user.email_verified && <span className="text-[10px] font-bold text-yellow-400 normal-case">⚠️ Не подтверждён</span>}
                    </label>
                    <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="не указан"
                      className="w-full bg-bg border border-line px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors" />
                    {!user.email_verified && (
                      <div className="mt-2">
                        <button type="button" onClick={handleSendVerification} disabled={verifySending}
                          className="btn-outline text-[10px] disabled:opacity-50">
                          {verifySending ? "..." : "Подтвердить email"}
                        </button>
                        {verifyMsg && (
                          <p className={`text-[11px] mt-1.5 ${verifyMsg.ok ? "text-green-400" : "text-accent"}`}>
                            {verifyMsg.text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {user.telegram_id && (
                    <div>
                      <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Telegram ID</p>
                      <p className="text-sm font-mono text-muted">{user.telegram_id}</p>
                    </div>
                  )}
                  {saveMsg && <p className={`text-xs ${saveMsg.ok ? "text-accent" : "text-accent-warm"}`}>{saveMsg.text}</p>}
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
                    {saving ? "..." : "Сохранить"}
                  </button>
                </div>
              </div>

              <div className="ingot rounded-xl p-6">
                <h3 className="text-xs font-bold tracking-widest uppercase text-accent mb-4">Уведомления</h3>
                <div className="space-y-4 max-w-md">
                  {([
                    { key: "notify_new_drops" as const, label: "Новые дропы",    sub: "Уведомления о новых товарах", disabled: false },
                    { key: "notify_promos"    as const, label: "Промо и акции",  sub: "Скидки и специальные предложения", disabled: false },
                    { key: "notify_email"     as const, label: "Рассылки на почту", sub: user.email_verified ? "Новости и дропы на email" : "Сначала подтверди email", disabled: !user.email_verified },
                  ]).map(({ key, label, sub, disabled }) => (
                    <label key={key} className={`flex items-center justify-between ${
                      disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}>
                      <div>
                        <div className="text-sm font-bold text-text">{label}</div>
                        <div className="text-[11px] text-muted">{sub}</div>
                      </div>
                      <div className="relative">
                        <input type="checkbox" className="sr-only peer"
                          disabled={disabled}
                          checked={!!user[key]}
                          onChange={(e) => handleNotify(key, e.target.checked)} />
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button onClick={logout}
                className="btn-outline text-xs border-accent-warm/30 text-accent-warm hover:border-accent-warm">
                Выйти из аккаунта
              </button>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}
