"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";
import { useCart } from "@/context/CartContext";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const [status, setStatus] = useState<"checking" | "succeeded" | "failed" | "pending">("checking");
  const { clearCart } = useCart();
  const [cartCleared, setCartCleared] = useState(false);

  useEffect(() => {
    if (!paymentId) {
      setStatus("failed");
      return;
    }

    const checkPayment = async () => {
      try {
        const res = await fetch(`/api/check-payment/${paymentId}`);
        const data = await res.json();
        if (data.status === "succeeded") {
          setStatus("succeeded");
        } else if (data.status === "canceled") {
          setStatus("failed");
        } else {
          setStatus("pending");
        }
      } catch {
        setStatus("checking");
      }
    };

    checkPayment();
    const interval = setInterval(checkPayment, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [paymentId]);

  // Clear cart only after payment confirmed succeeded
  useEffect(() => {
    if (status === "succeeded" && !cartCleared) {
      clearCart();
      setCartCleared(true);
    }
  }, [status, clearCart, cartCleared]);

  return (
    <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
      <ScrollReveal>
        <div className="flex flex-col items-center max-w-sm text-center">
          {status === "checking" && (
            <>
              <div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-6" />
              <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
                Проверяем оплату
              </h1>
              <p className="text-sm text-muted">
                Подожди несколько секунд...
              </p>
            </>
          )}

          {status === "succeeded" && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6 sd-scale-in">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" className="sd-check" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4 sd-fade-up">
                Оплачено!
              </h1>
              <p className="text-sm text-muted mb-8">
                Твой заказ принят в обработку. Мы свяжемся с тобой в Telegram для уточнения деталей доставки.
              </p>
              <div className="space-y-3 w-full">
                <Link href="/collection" className="btn-primary w-full block text-center">
                  Продолжить покупки
                </Link>
                <Link href="/" className="btn-outline w-full block text-center">
                  На главную
                </Link>
              </div>
            </>
          )}

          {status === "pending" && (
            <>
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
                Ожидаем оплату
              </h1>
              <p className="text-sm text-muted mb-8">
                Платёж ещё не подтверждён. Если ты уже оплатил — подожди немного, мы автоматически проверим статус.
              </p>
              <Link href="/" className="btn-primary w-full block text-center">
                На главную
              </Link>
            </>
          )}

          {status === "failed" && (
            <>
              <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4915C" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
                Оплата не прошла
              </h1>
              <p className="text-sm text-muted mb-8">
                {paymentId ? "Платёж не был завершён." : "Параметры оплаты не найдены."} Попробуй оформить заказ заново.
              </p>
              <div className="space-y-3 w-full">
                <Link href="/cart" className="btn-primary w-full block text-center">
                  Вернуться в корзину
                </Link>
                <Link href="/collection" className="btn-outline w-full block text-center">
                  Каталог
                </Link>
              </div>
            </>
          )}
        </div>
      </ScrollReveal>
    </div>
  );
}
