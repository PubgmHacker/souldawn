"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import ScrollReveal from "@/components/ScrollReveal";
import CdekMap, { type CdekPoint } from "@/components/CdekMap";

const PROCESSING_STEPS = [
  "Проверяем наличие",
  "Считаем сумму",
  "Создаём платёж",
  "Перенаправляем на оплату",
];

type Step = "form" | "processing" | "error";

export default function CheckoutPage() {
  const { items, totalPrice, totalItems } = useCart();
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "sbp">("card");
  const [delivery, setDelivery] = useState<"cdek" | "courier">("cdek");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  // Выбранный пункт выдачи СДЭК (с карты).
  const [pvz, setPvz] = useState<CdekPoint | null>(null);
  const [deliveryCost, setDeliveryCost] = useState(0); // копейки
  const [deliveryDays, setDeliveryDays] = useState<{ min: number | null; max: number | null }>({ min: null, max: null });
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Проигрываем шаги анимации, пока создаётся платёж (косметика).
  useEffect(() => {
    if (step !== "processing") {
      setStepIndex(0);
      return;
    }
    const t = setInterval(() => {
      setStepIndex((i) => (i < PROCESSING_STEPS.length - 1 ? i + 1 : i));
    }, 350);
    return () => clearInterval(t);
  }, [step]);

  const applyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const res = await fetch("/api/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setPromoApplied({ code, discount: data.discount });
        setPromoError("");
      } else {
        setPromoApplied(null);
        setPromoError(data.error || "Промокод не найден");
      }
    } catch {
      setPromoApplied(null);
      setPromoError("Не удалось проверить промокод");
    } finally {
      setPromoLoading(false);
    }
  };

  const discountAmount = promoApplied
    ? Math.round(totalPrice * promoApplied.discount / 100)
    : 0;
  // Стоимость доставки хранится в копейках — переводим в рубли для итога.
  const deliveryRub = Math.round(deliveryCost / 100);
  const finalPrice = totalPrice - discountAmount + deliveryRub;

  // Авторасчёт доставки СДЭК по городу/индексу.
  useEffect(() => {
    if (delivery !== "cdek") {
      setDeliveryCost(0);
      setDeliveryDays({ min: null, max: null });
      return;
    }
    if (!city.trim() && !postalCode.trim() && !pvz) {
      setDeliveryCost(0);
      setDeliveryDays({ min: null, max: null });
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setDeliveryLoading(true);
      try {
        const res = await fetch("/api/delivery/cdek", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            region: city,
            postal_code: postalCode || undefined,
            pvz_code: pvz?.code || undefined,
            total_qty: totalItems,
          }),
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setDeliveryCost(Number(data.cost_kopecks) || 0);
          setDeliveryDays({ min: data.min_days ?? null, max: data.max_days ?? null });
        }
      } catch {
        // оставляем предыдущее значение
      } finally {
        if (!cancelled) setDeliveryLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [delivery, city, postalCode, pvz, totalItems]);

  // При выборе ПВЗ на карте — автозаполняем адрес/индекс/город.
  const handlePvzSelect = (point: CdekPoint) => {
    setPvz(point);
    if (point.city) setCity(point.city);
    if (point.postalCode) setPostalCode(point.postalCode);
  };

  if (items.length === 0 && step !== "processing") {
    return (
      <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
        <ScrollReveal>
          <div className="flex flex-col items-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"
              className="text-muted/30 mb-6">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
              Нечего оплачивать
            </h1>
            <p className="text-sm text-muted mb-8">
              Добавь товары в корзину, чтобы оформить заказ.
            </p>
            <Link href="/collection" className="btn-primary">
              Смотреть каталог
            </Link>
          </div>
        </ScrollReveal>
      </div>
    );
  }

  const handlePay = async () => {
    if (!phone.trim()) {
      setError("Укажи телефон для связи");
      return;
    }
    setError("");
    setStep("processing");

    try {
      const orderItems = items.map((i) => ({
        id: i.product.id,
        name: i.product.name,
        size: i.size,
        qty: i.quantity,
      }));

      if (delivery === "cdek" && !pvz) {
        setStep("form");
        setError("Выбери пункт выдачи СДЭК на карте");
        return;
      }

      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          contact: {
            phone,
            name,
            email,
            city,
            region: city,
            postal_code: pvz?.postalCode || postalCode || undefined,
            pvz_code: pvz?.code || undefined,
            pvz_address: pvz?.fullAddress || pvz?.address || undefined,
          },
          payment_method: paymentMethod,
          promo_code: promoApplied?.code || undefined,
          delivery,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStep("error");
        setError(data.error || "Ошибка при создании платежа");
        return;
      }

      if (data.confirmation_url) {
        // Cart is NOT cleared here — it's cleared only on /payment/success after confirmed payment
        window.location.href = data.confirmation_url;
      } else {
        setStep("error");
        setError("Не получена ссылка на оплату");
      }
    } catch {
      setStep("error");
      setError("Ошибка сети. Попробуй ещё раз.");
    }
  };

  const paymentMethods = [
    { id: "card" as const, icon: "💳", name: "Банковская карта", desc: "Visa, MasterCard, МИР" },
    { id: "sbp" as const, icon: "📱", name: "СБП", desc: "Система быстрых платежей" },
  ];

  if (step === "processing") {
    return (
      <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center sd-scale-in">
          <div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-8" />
          <h2 className="text-xl font-black tracking-tight uppercase mb-6">Оформляем заказ</h2>
          <div className="space-y-3 w-full max-w-xs">
            {PROCESSING_STEPS.map((label, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    done || active ? "opacity-100" : "opacity-30"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      done
                        ? "bg-accent border-accent"
                        : active
                        ? "border-accent"
                        : "border-white/20"
                    }`}
                  >
                    {done ? (
                      <span className="text-bg text-[10px] font-bold">✓</span>
                    ) : active ? (
                      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    ) : null}
                  </span>
                  <span className={done || active ? "text-text" : "text-muted"}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="flex flex-col items-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B2500" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <h2 className="text-xl font-black tracking-tight uppercase mb-2 text-text">Ошибка</h2>
          <p className="text-sm text-muted mb-8 text-center max-w-xs">{error}</p>
          <button onClick={() => setStep("form")} className="btn-primary">Попробовать снова</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-3xl mx-auto">
        <ScrollReveal>
          <div>
            <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-4">Оплата</p>
            <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight uppercase">Оформление</h1>
            <p className="mt-3 text-sm text-muted">Проверь данные и оплати заказ</p>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left — Form */}
          <div className="lg:col-span-3 space-y-8">
            {/* Order Summary */}
            <ScrollReveal delay={100}>
              <div className="glass rounded-2xl p-6">
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Твой заказ</h2>
                <div className="space-y-3">
                  {items.map((item) => {
                    const price = parseInt(item.product.price.replace(/\s/g, "").replace("₽", ""));
                    return (
                      <div key={`${item.product.id}-${item.size}`} className="flex justify-between items-center text-sm">
                        <div className="flex-1 min-w-0">
                          <span className="text-text font-medium truncate block">{item.product.name}</span>
                          <span className="text-[11px] text-muted">{item.size} · {item.quantity} шт.</span>
                        </div>
                        <span className="text-accent font-bold ml-4">
                          {(price * item.quantity).toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollReveal>

            {/* Contact Info */}
            <ScrollReveal delay={200}>
              <div className="glass rounded-2xl p-6">
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Контакты</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted block mb-1.5">Телефон *</label>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="+7 (999) 123-45-67" autoComplete="tel"
                      className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted block mb-1.5">Имя</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      placeholder="Как к тебе обращаться?" autoComplete="name"
                      className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted block mb-1.5">Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Для чека об оплате" autoComplete="email"
                      className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300" />
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Delivery */}
            <ScrollReveal delay={250}>
              <div className="border border-white/5 bg-surface/50 p-6">
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Доставка</h2>
                <div className="space-y-3">
                  {([
                    { id: "cdek" as const, icon: "\uD83D\uDCE6", name: "СДЭК", desc: "Расчёт по городу/индексу" },
                    { id: "courier" as const, icon: "\uD83D\uDE9A", name: "Курьер", desc: "Доставка по адресу" },
                  ]).map((d) => (
                    <button key={d.id} onClick={() => setDelivery(d.id)} type="button"
                      className={`w-full flex items-center gap-3 p-4 border transition-all duration-200 text-left ${
                        delivery === d.id ? "border-accent bg-accent/5" : "border-white/10 hover:border-white/20"
                      }`}>
                      <div className="w-10 h-10 flex items-center justify-center bg-surface border border-white/5 text-lg flex-shrink-0">{d.icon}</div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-text">{d.name}</div>
                        <div className="text-[11px] text-muted">{d.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        delivery === d.id ? "border-accent bg-accent" : "border-white/20"
                      }`}>
                        {delivery === d.id && <span className="text-bg text-[10px] font-bold">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted block mb-1.5">Город / регион</label>
                    <input type="text" value={city} onChange={(e) => { setCity(e.target.value); setPvz(null); }}
                      placeholder="Напр. Москва"
                      className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted block mb-1.5">Индекс</label>
                    <input type="text" value={postalCode} onChange={(e) => { setPostalCode(e.target.value); setPvz(null); }}
                      placeholder="101000" inputMode="numeric"
                      className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300" />
                  </div>
                </div>

                {/* Карта ПВЗ СДЭК — выбор пункта выдачи */}
                {delivery === "cdek" && (
                  <div className="mt-4">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-muted block mb-2">
                      Пункт выдачи на карте
                    </label>
                    <CdekMap
                      city={city}
                      postalCode={postalCode}
                      selectedCode={pvz?.code ?? null}
                      onSelect={handlePvzSelect}
                    />
                    {pvz && (
                      <div className="mt-3 p-3 border border-accent/30 bg-accent/5 text-sm">
                        <div className="font-bold text-text">{pvz.name}</div>
                        <div className="text-[12px] text-muted mt-0.5">{pvz.fullAddress || pvz.address}</div>
                        {pvz.workTime && (
                          <div className="text-[11px] text-muted/70 mt-0.5">Режим: {pvz.workTime}</div>
                        )}
                        {pvz.postalCode && (
                          <div className="text-[11px] text-muted/70">Индекс: {pvz.postalCode}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Payment Method */}
            <ScrollReveal delay={300}>
              <div className="glass rounded-2xl p-6">
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-4">Способ оплаты</h2>
                <div className="space-y-3">
                  {paymentMethods.map((m) => (
                    <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                      className={`w-full flex items-center gap-3 p-4 border transition-all duration-200 text-left ${
                        paymentMethod === m.id ? "border-accent bg-accent/5" : "border-white/10 hover:border-white/20"
                      }`}>
                      <div className="w-10 h-10 flex items-center justify-center bg-surface border border-white/5 text-lg flex-shrink-0">
                        {m.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-text">{m.name}</div>
                        <div className="text-[11px] text-muted">{m.desc}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        paymentMethod === m.id ? "border-accent bg-accent" : "border-white/20"
                      }`}>
                        {paymentMethod === m.id && <span className="text-bg text-[10px] font-bold">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Right — Summary & Pay */}
          <div className="lg:col-span-2">
            <ScrollReveal delay={400}>
              <div className="sticky top-28 glass-strong rounded-2xl p-6 shadow-card">
                <h2 className="text-[10px] font-bold tracking-widest uppercase text-muted mb-6">Итого</h2>
                {/* Promo Code */}
                <div className="mb-6">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-muted block mb-2">Промокод</label>
                  <div className="flex gap-0">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Введи код"
                      disabled={!!promoApplied}
                      className="flex-1 bg-transparent border border-white/10 border-r-0 px-3 py-2.5 text-xs text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300 disabled:opacity-50"
                    />
                    {promoApplied ? (
                      <button
                        onClick={() => { setPromoApplied(null); setPromoCode(""); }}
                        className="px-4 py-2.5 bg-accent-red/20 text-accent-red text-[10px] font-bold tracking-wider uppercase border border-accent-red/30 hover:bg-accent-red/30 transition-colors"
                      >
                        Убрать
                      </button>
                    ) : (
                      <button
                        onClick={applyPromo}
                        className="px-4 py-2.5 bg-accent text-bg text-[10px] font-bold tracking-wider uppercase hover:bg-white transition-colors"
                      >
                        Применить
                      </button>
                    )}
                  </div>
                  {promoError && (
                    <p className="text-accent-red text-[11px] mt-1.5">{promoError}</p>
                  )}
                  {promoApplied && (
                    <p className="text-green-400 text-[11px] mt-1.5">
                      Промокод {promoApplied.code} применён: -{promoApplied.discount}%
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Товары ({totalItems})</span>
                    <span className="text-text font-bold">{totalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Скидка ({promoApplied.discount}%)</span>
                      <span className="text-green-400 font-bold">-{discountAmount.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">
                      Доставка {delivery === "cdek" ? "СДЭК" : "курьер"}
                      {deliveryDays.min && (
                        <span className="text-[11px] text-muted/70"> ({deliveryDays.min}–{deliveryDays.max} дн.)</span>
                      )}
                    </span>
                    <span className="text-text font-bold">
                      {deliveryLoading
                        ? "…"
                        : deliveryRub > 0
                        ? `${deliveryRub.toLocaleString("ru-RU")} ₽`
                        : delivery === "cdek"
                        ? "укажи город"
                        : "по тарифу"}
                    </span>
                  </div>
                  <div className="h-[1px] bg-white/10 my-2" />
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-text">Итого</span>
                    <span className="text-2xl font-black text-accent">{finalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/20 text-accent-red text-[12px] text-center">
                    {error}
                  </div>
                )}

                <button onClick={handlePay} className="btn-primary w-full">
                  Оплатить {finalPrice.toLocaleString("ru-RU")} ₽
                </button>

                <Link href="/cart" className="btn-outline w-full mt-3 block text-center">
                  Назад в корзину
                </Link>

                <div className="mt-6 pt-4 border-t border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent flex-shrink-0">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="text-[11px] text-muted">Безопасная оплата через YooKassa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent flex-shrink-0">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                    </svg>
                    <span className="text-[11px] text-muted">Возврат в течение 30 дней</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
