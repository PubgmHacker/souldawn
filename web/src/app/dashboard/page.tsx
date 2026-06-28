"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth, formatPrice, type Order } from "@/context/AuthContext";
import ScrollReveal from "@/components/ScrollReveal";

const STATUS_MAP: Record<string, string> = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400/80 bg-amber-400/10",
  paid: "text-emerald-400/80 bg-emerald-400/10",
  processing: "text-[#C8C8D0]/80 bg-[rgba(200,200,210,0.1)]",
  shipped: "text-blue-400/80 bg-blue-400/10",
  delivered: "text-[#C8C8D0]/80 bg-[rgba(200,200,210,0.1)]",
  cancelled: "text-red-400/80 bg-red-400/10",
};

function deliveryLabel(type: string, city: string, pvz: string, address: string): string {
  if (type === "cdek-pvz") return pvz ? `ПВЗ СДЭК · ${city}${pvz ? ", " + pvz : ""}` : "ПВЗ СДЭК";
  if (type === "cdek-courier") return address ? `Курьер СДЭК · ${city}` : "Курьер СДЭК";
  if (type === "post") return address ? `Почта России · ${city}` : "Почта России";
  return type || "—";
}

export default function DashboardPage() {
  const {
    user,
    loading,
    orders,
    logout,
    updateProfile,
  } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [drops, setDrops] = useState(user?.notify_new_drops ?? false);
  const [promos, setPromos] = useState(user?.notify_promos ?? false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/profile");
    }
  }, [loading, user, router]);

  // Send welcome notification on first login
  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications").then(r => r.json()).then(d => {
      const notifs = d.notifications || [];
      if (notifs.length === 0) {
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "welcome",
            userId: user.id,
          }),
        });
      }
    }).catch(() => {});
  }, [user]);

  const handleToggle = useCallback(
    async (field: string, value: boolean) => {
      if (field === "drops") {
        setDrops(value);
        setSaving(true);
        await updateProfile({ notify_new_drops: value });
        setSaving(false);
      } else {
        setPromos(value);
        setSaving(true);
        await updateProfile({ notify_promos: value });
        setSaving(false);
      }
    },
    [updateProfile],
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  // Show admin link for admins
  useEffect(() => {
    if (user?.role === "admin" || user?.role === "owner") {
      document.documentElement.style.setProperty("--is-admin", "inline-block");
    } else {
      document.documentElement.style.setProperty("--is-admin", "none");
    }
  }, [user]);

  if (loading || !user) {
    return (
      <div className="pt-24 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-12 h-12 border-2 border-[rgba(200,200,210,0.2)] border-t-[#C8C8D0] rounded-full animate-spin mb-6" />
        <p className="text-sm text-[#6B6B78]">Загрузка...</p>
      </div>
    );
  }

  const isActive = user.is_active !== false;

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#C8C8D0] mb-4">
                Личный кабинет
              </p>
              <h1 className="font-[family-name:var(--font-oswald)] text-4xl md:text-6xl font-black tracking-tight uppercase text-[#E8E8F0]">
                Dashboard
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-bold tracking-widest uppercase text-[#6B6B78] hover:text-red-400 transition-colors duration-300 border border-[rgba(200,200,210,0.14)] px-4 py-2 hover:border-red-400/30"
            >
              Выйти
            </button>
            <Link
              href="/admin"
              className="text-xs font-bold tracking-widest uppercase text-[#C8C8D0]/40 hover:text-[#C8C8D0] transition-colors duration-300 border border-[rgba(200,200,210,0.08)] px-4 py-2 hover:border-[rgba(200,200,210,0.2)]"
              style={{ display: "var(--is-admin, none)" }}
            >
              Админ-панель
            </Link>
          </div>
        </ScrollReveal>

        {/* User Profile Card */}
        <ScrollReveal delay={100}>
          <div className="mt-12 border border-[rgba(200,200,210,0.14)] bg-[#101014] p-6 md:p-8">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              {user.photo_url ? (
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[rgba(200,200,210,0.2)] flex-shrink-0">
                  <Image
                    src={user.photo_url}
                    alt={user.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-[rgba(200,200,210,0.08)] border border-[rgba(200,200,210,0.14)] flex items-center justify-center flex-shrink-0">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-[#6B6B78]"
                  >
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="font-[family-name:var(--font-oswald)] text-2xl font-black tracking-tight uppercase text-[#E8E8F0] truncate">
                  {user.name || user.username}
                </h2>
                {user.email && (
                  <p className="text-sm text-[#6B6B78] mt-1 truncate">
                    {user.email}
                  </p>
                )}
                {user.telegram_id && (
                  <p className="text-xs text-[#6B6B78]/60 mt-1">
                    Telegram ID: {user.telegram_id}
                    {user.username && ` · @${user.username}`}
                  </p>
                )}
              </div>
            </div>

            {/* Profile Details */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/50 block mb-1">
                  Email
                </span>
                <p className="text-sm text-[#E8E8F0]">
                  {user.email || "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/50 block mb-1">
                  Аккаунт создан
                </span>
                <p className="text-sm text-[#E8E8F0]">
                  {user.created_at
                    ? new Date(user.created_at).toLocaleDateString("ru-RU")
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/50 block mb-1">
                  Статус
                </span>
                <p className={`text-sm font-bold tracking-wider uppercase ${
                  isActive ? "text-green-400/80" : "text-red-400/80"
                }`}>
                  {isActive ? "Активен" : "Заблокирован"}
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Orders History */}
        <ScrollReveal delay={150}>
          <div className="mt-8">
            <h3 className="font-[family-name:var(--font-oswald)] text-xl font-black tracking-tight uppercase text-[#E8E8F0] mb-6">
              История заказов
            </h3>

            {orders.length === 0 ? (
              <div className="border border-[rgba(200,200,210,0.08)] bg-[#101014]/50 p-10 text-center">
                <p className="text-sm text-[#6B6B78]">
                  У вас пока нет заказов.
                </p>
                <Link
                  href="/collection"
                  className="inline-block mt-4 text-xs font-bold tracking-widest uppercase text-[#C8C8D0] hover:text-[#E8E8F0] transition-colors duration-300"
                >
                  Смотреть каталог →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order: Order) => {
                  const statusKey = STATUS_MAP[order.status] ? order.status : "pending";
                  return (
                    <details key={order.id} className="border border-[rgba(200,200,210,0.08)] bg-[#101014]/50 group">
                      <summary className="px-5 py-4 cursor-pointer hover:bg-[rgba(200,200,210,0.02)] transition-colors flex items-center gap-4 text-xs">
                        {/* Cipher */}
                        <span className="font-black text-[#C8C8D0] font-[family-name:var(--font-oswald)] tracking-wider text-sm shrink-0">
                          {order.cipher || `#${order.id.slice(0, 8)}`}
                        </span>

                        {/* Status badge */}
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          STATUS_COLORS[statusKey] || "text-[#6B6B78]"
                        }`}>
                          {STATUS_MAP[statusKey] || order.status}
                        </span>

                        {/* Date */}
                        <span className="text-[#6B6B78]/50 hidden sm:inline">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleDateString("ru-RU")
                            : "—"}
                        </span>

                        {/* Item names preview */}
                        <span className="text-[#E8E8F0]/60 flex-1 truncate hidden md:inline">
                          {order.itemNames || `${order.itemsCount || order.items.length} шт`}
                        </span>

                        {/* Total */}
                        <span className="text-[#E8E8F0] font-bold shrink-0">
                          {formatPrice(order.total)} ₽
                        </span>
                      </summary>

                      <div className="px-5 pb-4 border-t border-[rgba(200,200,210,0.05)] pt-4">
                        {/* Order details grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-4">
                          <div>
                            <span className="text-[#6B6B78]/50 block mb-0.5">Доставка</span>
                            <p className="text-[#E8E8F0]">
                              {deliveryLabel(
                                order.deliveryType,
                                order.deliveryCity,
                                order.pvzAddress,
                                order.deliveryAddress
                              )}
                            </p>
                          </div>
                          {order.tracking && (
                            <div>
                              <span className="text-[#6B6B78]/50 block mb-0.5">Трек-код</span>
                              <p className="text-[#C8C8D0] font-bold font-mono tracking-wider">{order.tracking}</p>
                            </div>
                          )}
                        </div>

                        {/* Price breakdown */}
                        <div className="text-xs text-[#6B6B78]/50 mb-4">
                          <span>Товаров: {order.itemsCount || order.items.length}</span>
                          <span className="mx-2">·</span>
                          <span>Подитог: {formatPrice(order.subtotal || order.total)} ₽</span>
                          {order.deliveryCost > 0 && (
                            <>
                              <span className="mx-2">·</span>
                              <span>Доставка: {formatPrice(order.deliveryCost)} ₽</span>
                            </>
                          )}
                          {order.discountAmount > 0 && (
                            <>
                              <span className="mx-2">·</span>
                              <span className="text-emerald-400/70">Скидка: −{formatPrice(order.discountAmount)} ₽</span>
                            </>
                          )}
                          {order.promoCode && (
                            <>
                              <span className="mx-2">·</span>
                              <span>Промо: {order.promoCode}</span>
                            </>
                          )}
                        </div>

                        {/* Items list */}
                        <div className="border-t border-[rgba(200,200,210,0.06)] pt-3">
                          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/40 mb-2">
                            Состав заказа
                          </p>
                          <div className="space-y-1.5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="min-w-0">
                                  <p className="text-[#E8E8F0]/80">{item.name}</p>
                                  {item.size && (
                                    <span className="text-[#6B6B78]/40 ml-1">({item.size})</span>
                                  )}
                                </div>
                                <span className="text-[#6B6B78]/60 shrink-0 ml-2">
                                  {formatPrice(item.price)} ₽ × {item.qty || 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Notification Settings */}
        <ScrollReveal delay={200}>
          <div className="mt-8 border border-[rgba(200,200,210,0.14)] bg-[#101014] p-6 md:p-8">
            <h3 className="font-[family-name:var(--font-oswald)] text-xl font-black tracking-tight uppercase text-[#E8E8F0] mb-6">
              Уведомления
            </h3>

            {saving && (
              <p className="text-xs text-[#6B6B78] mb-4">Сохранение...</p>
            )}

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#E8E8F0] font-bold">
                    Новые дропы
                  </p>
                  <p className="text-xs text-[#6B6B78]/60 mt-0.5">
                    Узнавайте первыми о новых коллекциях
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("drops", !drops)}
                  className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${
                    drops ? "bg-[#C8C8D0]" : "bg-[rgba(200,200,210,0.1)]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#08080A] transition-transform duration-300 ${
                      drops ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="h-px bg-[rgba(200,200,210,0.06)]" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#E8E8F0] font-bold">
                    Промо-акции
                  </p>
                  <p className="text-xs text-[#6B6B78]/60 mt-0.5">
                    Скидки и специальные предложения
                  </p>
                </div>
                <button
                  onClick={() => handleToggle("promos", !promos)}
                  className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${
                    promos ? "bg-[#C8C8D0]" : "bg-[rgba(200,200,210,0.1)]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#08080A] transition-transform duration-300 ${
                      promos ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
