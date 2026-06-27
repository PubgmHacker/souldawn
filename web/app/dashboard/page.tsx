"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth, formatPrice } from "@/context/AuthContext";
import ScrollReveal from "@/components/ScrollReveal";

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
    case "processing":
      return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    case "paid":
    case "shipped":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "delivered":
      return "bg-accent/10 text-accent border-accent/20";
    case "cancelled":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-white/10 text-white border-white/20";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending":
      return "Ожидает";
    case "processing":
      return "Обработка";
    case "paid":
      return "Оплачен";
    case "shipped":
      return "Отправлен";
    case "delivered":
      return "Доставлен";
    case "cancelled":
      return "Отменён";
    default:
      return status;
  }
};

export default function DashboardPage() {
  const { user, orders, isAdmin, logout, updateProfile } = useAuth();
  const [filter, setFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"overview" | "orders" | "profile">("overview");

  // Редактирование профиля
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [verifySending, setVerifySending] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  if (!user) return null;

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

  const startEdit = () => {
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setSaveMsg(null);
  };

  const handleNotify = async (
    key: "notify_new_drops" | "notify_promos" | "notify_email",
    val: boolean
  ) => {
    await updateProfile({ [key]: val });
  };

  const handleSendVerification = async () => {
    const target = (editEmail || user.email || "").trim();
    if (!target) {
      setVerifyMsg({ ok: false, text: "Сначала укажи email" });
      return;
    }
    setVerifySending(true);
    setVerifyMsg(null);
    try {
      const res = await fetch("/api/auth/email/request-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyMsg({ ok: false, text: data.error || "Не удалось отправить" });
      } else {
        setVerifyMsg({ ok: true, text: data.message || "Письмо отправлено — проверь почту" });
      }
    } catch {
      setVerifyMsg({ ok: false, text: "Ошибка сети" });
    } finally {
      setVerifySending(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    const res = await updateProfile({ name: editName, email: editEmail || null });
    setSaving(false);
    setSaveMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Сохранено" });
  };

  return (
    <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-4">
                Личный кабинет
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight uppercase">
                Добро пожаловать!
              </h1>
              <p className="text-sm text-muted mt-3">
                {user.name || user.username || user.email || "Пользователь"}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Link href="/collection" className="btn-primary text-xs">
                🛍️ Каталог
              </Link>
              {isAdmin && (
                <Link href="/admin" className="btn-outline text-xs">
                  👑 Админ
                </Link>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal delay={100}>
          <div className="mt-8 flex gap-2 border-b border-line">
            {(["overview", "orders", "profile"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); if (tab === "profile") startEdit(); }}
                className={`px-4 py-3 text-xs font-bold tracking-wider uppercase transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-accent text-accent"
                    : "text-muted hover:text-text"
                }`}
              >
                {tab === "overview" ? "📊 Обзор" : tab === "orders" ? "📦 Заказы" : "👤 Профиль"}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="mt-8 space-y-6">
            <ScrollReveal delay={150}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass rounded-2xl p-6">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Всего заказов</p>
                  <p className="text-3xl font-black text-accent">{orders.length}</p>
                </div>
                <div className="glass rounded-2xl p-6">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Активных</p>
                  <p className="text-3xl font-black">{activeOrders}</p>
                </div>
                <div className="glass rounded-2xl p-6">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Доставлено</p>
                  <p className="text-3xl font-black text-accent">{deliveredOrders}</p>
                </div>
                <div className="glass rounded-2xl p-6">
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2">Потрачено</p>
                  <p className="text-2xl font-black">{formatPrice(totalSpent)} ₽</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={200}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/collection" className="glass rounded-2xl p-6 hover:border-accent/40 transition-colors hover-lift">
                  <div className="text-3xl mb-3">👕</div>
                  <h3 className="text-sm font-bold">Смотреть каталог</h3>
                  <p className="text-[10px] text-muted mt-1">Все новые товары</p>
                </Link>
                <Link href="/cart" className="glass rounded-2xl p-6 hover:border-accent/40 transition-colors hover-lift">
                  <div className="text-3xl mb-3">🛒</div>
                  <h3 className="text-sm font-bold">Моя корзина</h3>
                  <p className="text-[10px] text-muted mt-1">Оформить покупку</p>
                </Link>
                <a href="https://t.me/souldawn_support_bot" target="_blank" rel="noopener noreferrer" className="glass rounded-2xl p-6 hover:border-accent/40 transition-colors hover-lift">
                  <div className="text-3xl mb-3">💬</div>
                  <h3 className="text-sm font-bold">Написать нам</h3>
                  <p className="text-[10px] text-muted mt-1">В Telegram поддержку</p>
                </a>
              </div>
            </ScrollReveal>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <ScrollReveal delay={150}>
            <div className="mt-8 space-y-4">
              <div className="flex gap-2 flex-wrap">
                {["all", "pending", "paid", "shipped", "delivered", "cancelled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 border rounded transition-all ${
                      filter === s
                        ? "border-accent text-accent bg-accent/10"
                        : "border-white/10 text-muted hover:border-white/20"
                    }`}
                  >
                    {s === "all" ? "Все" : getStatusLabel(s)}
                  </button>
                ))}
              </div>

              <div className="border border-white/10 bg-surface/50 p-6">
                {filtered.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-muted mb-4">
                      {filter === "all" ? "Заказов пока нет" : "Нет заказов с этим статусом"}
                    </p>
                    <Link href="/collection" className="btn-primary text-xs">Перейти в каталог</Link>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filtered.map((order) => (
                      <div key={order.id} className="border border-white/5 bg-bg/30 p-4 hover:bg-white/5 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-sm font-bold">#{order.id.slice(0, 8)}</p>
                            {order.created_at && (
                              <p className="text-[10px] text-muted mt-1">
                                {new Date(order.created_at).toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })}
                              </p>
                            )}
                          </div>
                          <span className={`text-[10px] font-bold tracking-wider uppercase px-3 py-1.5 border rounded ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>

                        <div className="space-y-1 mb-3 pb-3 border-b border-white/5">
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

                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-muted">Итого</span>
                          <span className="text-lg font-black text-accent">{formatPrice(order.total)} ₽</span>
                        </div>

                        {order.tracking && (
                          <div className="mt-3 text-[10px] text-blue-400 font-mono">📦 {order.tracking}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <ScrollReveal delay={150}>
            <div className="mt-8 space-y-6">
              {/* Редактирование */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-xs font-bold tracking-widest uppercase text-accent mb-6">Информация профиля</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2 block">Имя</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-bg border border-white/10 px-4 py-3 text-sm text-text focus:outline-none focus:border-accent/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted font-bold tracking-wider uppercase mb-2 flex items-center gap-2">
                      Email
                      {user.email && user.email_verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 normal-case tracking-normal">
                          ✅ Привязан
                        </span>
                      )}
                      {user.email && !user.email_verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-400 normal-case tracking-normal">
                          ⚠️ Не подтверждён
                        </span>
                      )}
                    </label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="не указан"
                      className="w-full bg-bg border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
                    />
                    {!user.email_verified && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={handleSendVerification}
                          disabled={verifySending}
                          className="btn-outline text-[10px] disabled:opacity-50"
                        >
                          {verifySending ? "..." : "Подтвердить email"}
                        </button>
                        {verifyMsg && (
                          <p className={`text-[11px] mt-1.5 ${verifyMsg.ok ? "text-green-400" : "text-accent-red"}`}>
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
                  {saveMsg && (
                    <p className={`text-xs ${saveMsg.ok ? "text-accent" : "text-accent-red"}`}>{saveMsg.text}</p>
                  )}
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-xs disabled:opacity-50">
                    {saving ? "..." : "Сохранить"}
                  </button>
                </div>
              </div>

              {/* Уведомления */}
              <div className="glass rounded-2xl p-6">
                <h3 className="text-xs font-bold tracking-widest uppercase text-accent mb-4">Уведомления</h3>
                <div className="space-y-4 max-w-md">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-text">Новые дропы</div>
                      <div className="text-[11px] text-muted">Уведомления о новых товарах</div>
                    </div>
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer"
                        checked={user.notify_new_drops}
                        onChange={(e) => handleNotify("notify_new_drops", e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                    </div>
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="text-sm font-bold text-text">Промо и акции</div>
                      <div className="text-[11px] text-muted">Скидки и специальные предложения</div>
                    </div>
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer"
                        checked={user.notify_promos}
                        onChange={(e) => handleNotify("notify_promos", e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                    </div>
                  </label>
                  <label className={`flex items-center justify-between ${user.email_verified ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
                    <div>
                      <div className="text-sm font-bold text-text">Рассылки на почту</div>
                      <div className="text-[11px] text-muted">
                        {user.email_verified ? "Новости и дропы на email" : "Сначала подтверди email"}
                      </div>
                    </div>
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer"
                        disabled={!user.email_verified}
                        checked={!!user.notify_email}
                        onChange={(e) => handleNotify("notify_email", e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                    </div>
                  </label>
                </div>
              </div>

              <button
                onClick={logout}
                className="btn-outline text-xs border-accent-red/30 text-accent-red hover:border-accent-red"
              >
                Выйти из аккаунта
              </button>
            </div>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
}
