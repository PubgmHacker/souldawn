"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

const BOT_NAME =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || "souldawn_support_bot";

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataAuth: (data: any) => void;
    };
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export default function TelegramLogin({ className = "" }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loginWithWidget, user } = useAuth();

  useEffect(() => {
    if (user) return;
    if (!containerRef.current) return;

    // Load Telegram Login Widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_NAME);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.async = true;

    // Define callback — sends widget data to Next.js (/api/auth/telegram) for JWT verification
    (window as any).onTelegramAuth = (telegramUser: TelegramUser) => {
      loginWithWidget(telegramUser as any);
    };

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [user, loginWithWidget]);

  if (user) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
}
