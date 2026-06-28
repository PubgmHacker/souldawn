"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import ScrollReveal from "@/components/ScrollReveal";

type DeliveryType = "cdek-pvz" | "cdek-courier" | "post";

interface CheckoutForm {
  name: string;
  phone: string;
  email: string;
  telegram: string;
  city: string;
  address: string;
  comment: string;
  delivery: DeliveryType;
  pvzCode: string;
  pvzAddress: string;
}

const EMPTY_FORM: CheckoutForm = {
  name: "",
  phone: "",
  email: "",
  telegram: "",
  city: "",
  address: "",
  comment: "",
  delivery: "cdek-pvz",
  pvzCode: "",
  pvzAddress: "",
};

// CDEK delivery zones: city → base cost (courier), PVZ cost
const CDEK_ZONES: Record<string, { courier: number; pvz: number }> = {
  "москва": { courier: 350, pvz: 250 },
  "санкт-петербург": { courier: 400, pvz: 280 },
  "москова": { courier: 350, pvz: 250 },
  "петербург": { courier: 400, pvz: 280 },
  "спб": { courier: 400, pvz: 280 },
  "мск": { courier: 350, pvz: 250 },
};

const DEFAULT_COURIER_COST = 590;
const DEFAULT_PVZ_COST = 390;
const POST_BASE_COST = 450;

// Payment timer: 20 minutes
const PAYMENT_TIMER_SECONDS = 20 * 60;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, hydrated, totalPrice, totalItems, clearCart, promoCode, discount, applyPromo, removePromo, discountedTotal } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [orderCipher, setOrderCipher] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState(false);
  const [deliveryCost, setDeliveryCost] = useState<number | null>(null);
  const prefilled = useRef(false);

  // Payment timer
  const [timerSeconds, setTimerSeconds] = useState(PAYMENT_TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!submitted) return;
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submitted]);

  // Pre-fill form from auth context if user is logged in
  useEffect(() => {
    if (prefilled.current || !user || form.name || form.email) return;
    prefilled.current = true;
    setForm((prev) => ({
      ...prev,
      name: prev.name || user.name || "",
      email: prev.email || user.email || "",
      telegram: prev.telegram || (user.telegram_id ? `@${user.username || ""}` : ""),
    }));
  }, [user]);

  const update = (field: keyof CheckoutForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Calculate delivery cost based on city
  useEffect(() => {
    const city = (form.city || "").trim().toLowerCase();
    if (form.delivery === "cdek-courier") {
      const zone = CDEK_ZONES[city];
      setDeliveryCost(zone ? zone.courier : DEFAULT_COURIER_COST);
    } else if (form.delivery === "cdek-pvz") {
      // PVZ cost depends on selected PVZ city, default until selected
      if (form.pvzAddress && form.city) {
        const zone = CDEK_ZONES[city];
        setDeliveryCost(zone ? zone.pvz : DEFAULT_PVZ_COST);
      } else {
        setDeliveryCost(null);
      }
    } else if (form.delivery === "post") {
      setDeliveryCost(POST_BASE_COST);
    }
  }, [form.delivery, form.city, form.pvzAddress]);

  // Calculate total with delivery
  const totalWithDelivery = discountedTotal + (deliveryCost ?? 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!form.email || !form.telegram) return;

    // Double-check items exist before submitting
    if (!items || items.length === 0) {
      setSubmitError("Корзина пуста. Добавьте товары перед оформлением.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          items: items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            size: item.size,
            quantity: item.quantity,
            price: parseInt(item.product.price.replace(/[^\d]/g, ""), 10),
          })),
          totalPrice: totalWithDelivery,
          deliveryCost: deliveryCost ?? 0,
          discount: discount > 0 ? totalPrice - discountedTotal : 0,
          promoCode: promoCode || undefined,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setOrderCipher(data.orderCipher || data.orderId || "");
        setSubmitted(true);
        clearCart();
      } else {
        setSubmitError(data?.error || "Ошибка при оформлении заказа. Попробуйте ещё раз.");
      }
    } catch {
      setSubmitError("Не удалось связаться с сервером. Проверьте подключение и попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect if cart empty (but not after successful submit, if there's an error, or before hydration)
  useEffect(() => {
    if (!hydrated) return; // Wait for localStorage to load
    if (items.length === 0 && !submitted && !submitError) {
      router.replace("/cart");
    }
  }, [items.length, submitted, submitError, hydrated, router]);

  if (submitted) {
    const timerExpired = timerSeconds <= 0;
    return (
      <div className="pt-24 pb-20 px-6 md:px-12 lg:px-24 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center max-w-md w-full">
          <div className="w-16 h-16 mx-auto mb-8 rounded-full border border-emerald-500/30 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl md:text-5xl font-black tracking-tight uppercase text-[#E8E8F0] mb-4">
            Принято
          </h1>
          <p className="text-sm text-[#6B6B78] leading-relaxed mb-2">
            Заказ оформлен. Рассвет близко.
          </p>

          {/* Order cipher */}
          {orderCipher && (
            <div className="my-6 py-4 border border-[rgba(200,200,210,0.1)] bg-[#101014]/50">
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B6B78]/50 mb-1">
                Номер заказа
              </p>
              <p className="text-lg font-black text-[#C8C8D0] font-[family-name:var(--font-oswald)] tracking-widest">
                {orderCipher}
              </p>
            </div>
          )}

          {/* Payment timer */}
          <div className="my-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={timerExpired ? "text-red-400" : "text-[#C8C8D0]/60"}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className={`text-xs font-bold tracking-widest uppercase ${timerExpired ? "text-red-400" : "text-[#6B6B78]/60"}`}>
                {timerExpired ? "Время оплаты истекло" : "Оплата"}
              </span>
            </div>
            <p className={`font-[family-name:var(--font-oswald)] text-4xl font-black tracking-tight ${timerExpired ? "text-red-400/60" : "text-[#E8E8F0]"}`}>
              {formatTimer(timerSeconds)}
            </p>
            {!timerExpired && (
              <p className="text-[11px] text-[#6B6B78]/40 mt-2">
                Для завершения оплаты у тебя осталось ограниченное время
              </p>
            )}
          </div>

          <p className="text-xs text-[#6B6B78]/50 mb-10">
            Трек-код будет отправлен на {form.email} автоматически СДЭК.
            {form.telegram && ` В Telegram (${form.telegram}) свяжемся в случае необходимости.`}
          </p>
          <button
            onClick={() => router.push("/collection")}
            className="px-10 py-3.5 text-[11px] font-black tracking-[0.15em] uppercase bg-[#C8C8D0] text-[#08080A] hover:bg-[#E8E8F0] transition-all duration-300"
          >
            Вернуться к коллекции
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && hydrated && !submitted) return null;

  // Input field shared class
  const inputClass = "w-full bg-transparent border border-[rgba(200,200,210,0.1)] px-4 py-3 text-sm text-[#E8E8F0] placeholder:text-[#6B6B78]/30 focus:outline-none focus:border-[rgba(200,200,210,0.3)] transition-colors duration-300";

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="mb-12">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#C8C8D0]/60 mb-4">
              Шаг 2 из 2
            </p>
            <h1 className="font-[family-name:var(--font-oswald)] text-4xl md:text-6xl font-black tracking-tight uppercase text-[#E8E8F0]">
              Оформление
            </h1>
          </div>
        </ScrollReveal>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Form */}
            <div className="lg:col-span-3 space-y-8">
              {/* Contact info — full width stacked fields for clean alignment */}
              <div className="border border-[rgba(200,200,210,0.08)] p-6">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#C8C8D0] mb-6">
                  Контактные данные
                </h3>
                <div className="space-y-4">
                  {/* Email — required */}
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                      Email <span className="text-red-400/60">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      required
                      className={inputClass}
                      placeholder="email@example.com"
                    />
                    <p className="text-[10px] text-[#6B6B78]/30 mt-1">
                      Трек-код СДЭК придёт на почту автоматически
                    </p>
                  </div>

                  {/* Telegram — required */}
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                      Telegram <span className="text-red-400/60">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#6B6B78]/40 select-none pointer-events-none">
                        @
                      </span>
                      <input
                        type="text"
                        value={form.telegram.replace("@", "")}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, "").trim();
                          update("telegram", val ? `@${val}` : "");
                        }}
                        required
                        className={`${inputClass} pl-8`}
                        placeholder="username"
                      />
                    </div>
                    <p className="text-[10px] text-[#6B6B78]/30 mt-1">
                      Для связи в случае необходимости
                    </p>
                  </div>

                  {/* Name + Phone row on larger screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                        Имя <span className="text-[#6B6B78]/30 normal-case tracking-normal font-normal">(необязательно)</span>
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        className={inputClass}
                        placeholder="Твоё имя"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                        Телефон <span className="text-[#6B6B78]/30 normal-case tracking-normal font-normal">(необязательно)</span>
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        className={inputClass}
                        placeholder="+7 (___) ___-__-__"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div className="border border-[rgba(200,200,210,0.08)] p-6">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#C8C8D0] mb-6">
                  Способ доставки
                </h3>
                <div className="space-y-3">
                  {[
                    { value: "cdek-pvz" as const, label: "ПВЗ СДЭК", desc: "Забрать из пункта выдачи", priceHint: "от 250 ₽" },
                    { value: "cdek-courier" as const, label: "Курьер СДЭК", desc: "Доставка до двери", priceHint: "от 350 ₽" },
                    { value: "post" as const, label: "Почта России", desc: "По всей стране", priceHint: "от 450 ₽" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        update("delivery", opt.value);
                        setDeliveryCost(null);
                      }}
                      className={`w-full flex items-center gap-4 p-4 border transition-all duration-300 text-left ${
                        form.delivery === opt.value
                          ? "border-[rgba(200,200,210,0.25)] bg-[rgba(200,200,210,0.04)]"
                          : "border-[rgba(200,200,210,0.06)] hover:border-[rgba(200,200,210,0.14)]"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${
                        form.delivery === opt.value
                          ? "border-[#C8C8D0]"
                          : "border-[rgba(200,200,210,0.2)]"
                      }`}>
                        {form.delivery === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-[#C8C8D0]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-[#E8E8F0] block">
                          {opt.label}
                        </span>
                        <span className="text-[11px] text-[#6B6B78]/60">
                          {opt.desc}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-[#6B6B78]/40 shrink-0">
                        {opt.priceHint}
                      </span>
                    </button>
                  ))}
                </div>

                {/* CDEK PVZ — manual input for city + address */}
                {form.delivery === "cdek-pvz" && (
                  <div className="mt-5 space-y-4">
                    {!form.pvzAddress ? (
                      <>
                        <div>
                          <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                            Город ПВЗ <span className="text-red-400/60">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.city}
                            onChange={(e) => update("city", e.target.value)}
                            className={inputClass}
                            placeholder="Москва"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                            Адрес пункта выдачи СДЭК <span className="text-red-400/60">*</span>
                          </label>
                          <input
                            type="text"
                            value={form.pvzAddress}
                            onChange={(e) => update("pvzAddress", e.target.value)}
                            className={inputClass}
                            placeholder="ул. Тверская, д. 15"
                          />
                          <p className="text-[10px] text-[#6B6B78]/30 mt-1">
                            Укажи адрес ближайшего пункта СДЭК. Найти можно на{" "}
                            <a
                              href="https://www.cdek.ru/office"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#C8C8D0]/50 hover:text-[#C8C8D0] underline underline-offset-2 transition-colors"
                            >
                              cdek.ru/office
                            </a>
                          </p>
                        </div>
                        {form.city && form.pvzAddress && (
                          <div className="flex items-center gap-2 px-3 py-2 border border-[rgba(200,200,210,0.06)] bg-[rgba(200,200,210,0.02)]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C8C8D0]/50 shrink-0">
                              <rect x="1" y="3" width="15" height="13" />
                              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                              <circle cx="5.5" cy="18.5" r="2.5" />
                              <circle cx="18.5" cy="18.5" r="2.5" />
                            </svg>
                            <span className="text-xs text-[#6B6B78]/60">
                              Доставка: <span className="text-[#C8C8D0] font-bold">
                                {(CDEK_ZONES[form.city.toLowerCase().trim()]?.pvz || DEFAULT_PVZ_COST).toLocaleString("ru-RU")} ₽
                              </span>
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-start gap-3 p-4 border border-[rgba(200,200,210,0.15)] bg-[rgba(200,200,210,0.02)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400/70 mt-0.5 shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[#E8E8F0] break-words">{form.city}, {form.pvzAddress}</p>
                          {deliveryCost !== null && deliveryCost > 0 && (
                            <p className="text-xs text-[#C8C8D0]/60 mt-1">
                              Доставка: {deliveryCost} ₽
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              update("pvzAddress", "");
                              update("city", "");
                              setDeliveryCost(null);
                            }}
                            className="text-[10px] font-bold tracking-wider uppercase text-[#6B6B78]/50 hover:text-[#C8C8D0] mt-1.5 transition-colors"
                          >
                            Изменить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* City for courier / post */}
                {form.delivery !== "cdek-pvz" && (
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                        Город *
                      </label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        required
                        className={inputClass}
                        placeholder="Москва"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                        Адрес *
                      </label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => update("address", e.target.value)}
                        required
                        className={inputClass}
                        placeholder="Улица, дом, квартира"
                      />
                    </div>
                    {/* Show calculated delivery cost */}
                    {form.city && deliveryCost !== null && (
                      <div className="flex items-center gap-2 px-3 py-2 border border-[rgba(200,200,210,0.06)] bg-[rgba(200,200,210,0.02)]">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#C8C8D0]/50 shrink-0">
                          <rect x="1" y="3" width="15" height="13" />
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                        <span className="text-xs text-[#6B6B78]/60">
                          Стоимость доставки: <span className="text-[#C8C8D0] font-bold">{deliveryCost.toLocaleString("ru-RU")} ₽</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Comment */}
                <div className="mt-5">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-[#6B6B78]/50 block mb-1.5">
                    Комментарий
                  </label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => update("comment", e.target.value)}
                    rows={3}
                    className="w-full bg-transparent border border-[rgba(200,200,210,0.1)] px-4 py-3 text-sm text-[#E8E8F0] placeholder:text-[#6B6B78]/30 focus:outline-none focus:border-[rgba(200,200,210,0.3)] transition-colors duration-300 resize-none"
                    placeholder="Пожелания к заказу..."
                  />
                </div>
              </div>

              {/* Submit error display */}
              {submitError && (
                <div className="border border-red-400/20 bg-red-400/[0.03] px-4 py-3">
                  <div className="flex items-start gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400/70 mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <p className="text-xs text-red-400/80 leading-relaxed">{submitError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitError("")}
                    className="text-[10px] text-[#6B6B78]/40 hover:text-[#E8E8F0] mt-2 transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-2">
              <div className="sticky top-24 border border-[rgba(200,200,210,0.08)] bg-gradient-to-b from-[rgba(200,200,210,0.02)] to-transparent p-6">
                <div className="mb-6">
                  <span className="text-[7px] font-black tracking-[0.35em] uppercase text-[#E8E8F0]/20 block leading-none">SOUL</span>
                  <span className="text-[7px] font-black tracking-[0.35em] uppercase text-[#C8C8D0]/15 block leading-none">DAWN</span>
                </div>

                <h3 className="text-xs font-bold tracking-widest uppercase text-[#6B6B78] mb-5">
                  Твой заказ
                </h3>

                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                  {items.map((item) => (
                    <div key={`${item.product.id}-${item.size}`} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#E8E8F0] truncate">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-[#6B6B78]/50">
                          {item.size} × {item.quantity}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#C8C8D0] shrink-0">
                        {(parseInt(item.product.price.replace(/[^\d]/g, ""), 10) * item.quantity).toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-[rgba(200,200,210,0.1)] to-transparent mb-5" />

                {/* Promo code */}
                {!promoCode ? (
                  <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (!promoInput.trim()) return; const ok = applyPromo(promoInput); if (!ok) { setPromoError(true); setTimeout(() => setPromoError(false), 2000); } else { setPromoInput(""); setPromoError(false); } }} className="mb-5">
                    <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/60 block mb-2">
                      Промокод
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                        placeholder="ВВЕДИ КОД"
                        className={`flex-1 bg-transparent border px-3 py-2.5 text-sm text-[#E8E8F0] placeholder:text-[#6B6B78]/30 outline-none transition-colors duration-300 ${
                          promoError
                            ? "border-red-400/60"
                            : "border-[rgba(200,200,210,0.1)] focus:border-[rgba(200,200,210,0.3)]"
                        }`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 text-[11px] font-black tracking-[0.15em] uppercase border border-[rgba(200,200,210,0.1)] text-[#C8C8D0] hover:border-[rgba(200,200,210,0.3)] hover:text-[#E8E8F0] transition-all duration-300 whitespace-nowrap"
                      >
                        OK
                      </button>
                    </div>
                    {promoError && (
                      <p className="text-[10px] text-red-400/70 mt-1.5 tracking-wide">
                        Неверный промокод
                      </p>
                    )}
                  </form>
                ) : (
                  <div className="mb-5 flex items-center justify-between border border-emerald-400/20 bg-emerald-400/[0.03] px-3 py-2.5">
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-emerald-400/60 block mb-0.5">
                        Промокод
                      </span>
                      <span className="text-sm font-bold text-emerald-400 tracking-wide">
                        {promoCode}{" "}
                        <span className="text-emerald-400/60 font-normal text-xs">−{discount}%</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { removePromo(); setPromoError(false); }}
                      className="w-6 h-6 flex items-center justify-center text-[#6B6B78]/50 hover:text-red-400 transition-colors duration-300"
                      aria-label="Удалить промокод"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B6B78]/60">
                      Снаряжение ({totalItems})
                    </span>
                    <span className={`font-bold ${discount > 0 ? "text-[#6B6B78]/50 line-through" : "text-[#E8E8F0]"}`}>
                      {totalPrice.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-400/70">
                        Скидка ({discount}%)
                      </span>
                      <span className="text-emerald-400 font-bold">
                        −{(totalPrice - discountedTotal).toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B6B78]/60">Доставка</span>
                    <span className="text-[#C8C8D0] font-bold text-xs">
                      {deliveryCost !== null
                        ? form.delivery === "cdek-pvz" && !form.pvzAddress
                          ? "укажи ПВЗ"
                          : `${deliveryCost.toLocaleString("ru-RU")} ₽`
                        : "расчёт при оформлении"}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-[rgba(200,200,210,0.1)] to-transparent mb-5" />

                <div className="flex justify-between items-baseline mb-8">
                  <span className="text-sm font-bold text-[#E8E8F0]">К оплате</span>
                  <span className="text-xl font-black text-[#C8C8D0] font-[family-name:var(--font-oswald)] tracking-tight">
                    {totalWithDelivery.toLocaleString("ru-RU")} ₽
                  </span>
                </div>

                {/* Validate PVZ selection for cdek-pvz */}
                {form.delivery === "cdek-pvz" && !form.pvzAddress && (
                  <p className="text-[10px] text-amber-400/60 mb-3 text-center">
                    Укажи город и адрес ПВЗ
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !form.email || !form.telegram || (form.delivery !== "cdek-pvz" && !form.city) || (form.delivery === "cdek-pvz" && !form.pvzAddress)}
                  className="w-full py-4 text-[11px] font-black tracking-[0.15em] uppercase bg-[#C8C8D0] text-[#08080A] hover:bg-[#E8E8F0] hover:shadow-[0_0_60px_rgba(200,200,210,0.1)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {submitting ? "Оформляем..." : "Подтвердить заказ"}
                </button>

                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full mt-3 py-3 text-xs font-bold tracking-widest uppercase text-[#6B6B78]/50 hover:text-[#C8C8D0] transition-colors duration-300"
                >
                  ← Назад
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}