"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyResult() {
  const params = useSearchParams();
  const status = params.get("status") || "invalid";

  const config: Record<string, { title: string; text: string; ok: boolean }> = {
    ok: {
      title: "Email подтверждён",
      text: "Почта привязана к аккаунту. Теперь можно получать рассылки на почту.",
      ok: true,
    },
    invalid: {
      title: "Ссылка недействительна",
      text: "Ссылка подтверждения истекла или некорректна. Запроси подтверждение заново в личном кабинете.",
      ok: false,
    },
    conflict: {
      title: "Email занят",
      text: "Этот email уже привязан к другому аккаунту.",
      ok: false,
    },
    error: {
      title: "Ошибка",
      text: "Не удалось подтвердить email. Попробуй ещё раз.",
      ok: false,
    },
  };
  const c = config[status] || config.invalid;

  return (
    <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center max-w-sm text-center animate-fade-in">
        {c.ok ? (
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"
              style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: "sd-draw 0.6s ease forwards" }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B2500" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">{c.title}</h1>
        <p className="text-sm text-muted mb-8">{c.text}</p>
        <Link href="/dashboard" className="btn-primary w-full block text-center">В личный кабинет</Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyResult />
    </Suspense>
  );
}
