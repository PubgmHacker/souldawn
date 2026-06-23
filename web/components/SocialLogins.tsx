"use client";

import { useState } from "react";

/**
 * Кнопки входа через Apple ID и VK.
 * Пока OAuth-приложения не настроены, роуты возвращают 501 —
 * показываем понятное сообщение вместо сломанного редиректа.
 */
export default function SocialLogins() {
  const [msg, setMsg] = useState("");

  const probe = async (provider: "apple" | "vk", label: string) => {
    setMsg("");
    try {
      const res = await fetch(`/api/auth/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 501) {
        setMsg(`Вход через ${label} скоро будет доступен`);
        return;
      }
      // Когда провайдер настроен — здесь будет редирект на OAuth провайдера.
      setMsg(`Вход через ${label} скоро будет доступен`);
    } catch {
      setMsg("Ошибка сети");
    }
  };

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={() => probe("apple", "Apple")}
        className="w-full flex items-center justify-center gap-2 border border-white/15 px-4 py-3 text-sm font-bold text-text hover:border-white/40 transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M16.36 12.78c.02 2.55 2.23 3.4 2.26 3.41-.02.06-.35 1.21-1.16 2.4-.7 1.03-1.43 2.05-2.58 2.07-1.13.02-1.49-.67-2.78-.67-1.29 0-1.69.65-2.76.69-1.11.04-1.96-1.11-2.66-2.14-1.44-2.1-2.54-5.93-1.06-8.52.73-1.28 2.04-2.1 3.46-2.12 1.09-.02 2.12.74 2.78.74.66 0 1.91-.91 3.22-.78.55.02 2.09.22 3.08 1.68-.08.05-1.84 1.08-1.82 3.07M14.2 5.36c.58-.71.98-1.69.87-2.67-.84.03-1.86.56-2.47 1.26-.54.62-1.02 1.62-.89 2.58.94.07 1.9-.47 2.49-1.17" />
        </svg>
        Войти через Apple
      </button>

      <button
        type="button"
        onClick={() => probe("vk", "VK")}
        className="w-full flex items-center justify-center gap-2 border border-white/15 px-4 py-3 text-sm font-bold text-text hover:border-white/40 transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#4a76a8" aria-hidden>
          <path d="M12.78 16.5c-5.47 0-8.59-3.75-8.72-9.99h2.74c.09 4.58 2.11 6.52 3.71 6.92V6.51h2.58v3.95c1.58-.17 3.24-1.97 3.8-3.95h2.58c-.43 2.44-2.23 4.24-3.51 4.98 1.28.6 3.33 2.17 4.11 5.01h-2.84c-.61-1.9-2.13-3.37-4.14-3.57v3.57h-.31" />
        </svg>
        Войти через VK
      </button>

      {msg && <p className="text-xs text-muted text-center">{msg}</p>}
    </div>
  );
}
