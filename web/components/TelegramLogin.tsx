"use client";

/**
 * SOULDAWN — TelegramLogin.
 *
 * Фикс бага «Узнай имя пользователя» / «Username Invalid»:
 * старый компонент безусловно загружал внешний iframe telegram.org,
 * который отдаёт эту ошибку если бот не привязан к домену (/setdomain в BotFather)
 * или NEXT_PUBLIC_TELEGRAM_BOT_NAME не задан.
 *
 * Решение: рендерим виджет Только если BOT_NAME задан.
 * Иначе — стилизованная кнопка с подсказкой войти через бот.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const BOT_NAME = (process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "").trim();

declare global {
  interface Window {
    TelegramLoginWidget?: { dataAuth: (data: any) => void };
    onTelegramAuth?: (user: any) => void;
  }
}

export default function TelegramLogin({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loginWithWidget, user } = useAuth();
  const [widgetError, setWidgetError] = useState(false);

  useEffect(() => {
    if (user) return;
    // Если BOT_NAME не задан — не загружаем виджет (именно он даёт «Username Invalid»)
    if (!BOT_NAME) {
      setWidgetError(true);
      return;
    }
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_NAME);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.async = true;
    script.onerror = () => setWidgetError(true);

    window.onTelegramAuth = (telegramUser: any) => {
      loginWithWidget(telegramUser);
    };

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [user, loginWithWidget]);

  if (user) return null;

  // Грейсфул фоллбэк: виджет недоступен — показываем подсказку
  if (widgetError || !BOT_NAME) {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div className="text-xs text-muted text-center max-w-xs leading-relaxed">
          Войдите через бот техподдержки{" "}
          <a
            href="https://t.me/souldawn_support_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            @souldawn_support_bot
          </a>
          {" "}или используйте вход по email.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
}
