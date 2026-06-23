"use client";

/**
 * SOULDAWN — TelegramMiniAppProvider.
 *
 * Фикс race condition: авто-логин запускается один раз после WebApp.ready()
 * и только если пользователь ещё не авторизован. Флаг attempted
 * гарантирует однократность попытки даже при перерендерах контекста.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: any;
        ready: () => void;
        close: () => void;
        showAlert: (message: string, callback?: () => void) => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        hapticFeedback: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
          selectionChanged: () => void;
        };
        MainButton: {
          show: () => void;
          hide: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}

export function TelegramMiniAppProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const { user, loading, refreshUser } = useAuth();
  // Флаг: авто-логин уже попытались — не повторяем
  const attempted = useRef(false);

  const authenticateMiniApp = useCallback(
    async (initData: string) => {
      if (attempted.current) return;
      attempted.current = true;

      try {
        const res = await fetch("/api/auth/mini-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ initData }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          // Обновляем состояние авторизации в контексте
          await refreshUser?.();
          setTimeout(() => router.push("/dashboard"), 300);
        } else {
          console.warn("[MiniApp] auth failed:", data.error);
        }
      } catch (err) {
        console.error("[MiniApp] auth error:", err);
      }
    },
    [router, refreshUser]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      // Не миниапп — просто отображаем детей
      setIsReady(true);
      return;
    }

    // Инициализируем WebApp
    tg.ready();
    tg.setHeaderColor("#08080A");
    tg.setBackgroundColor("#08080A");
    setIsReady(true);

    // Авто-логин: только если не авторизован и не в состоянии загрузки
    if (!loading && !user && tg.initData) {
      authenticateMiniApp(tg.initData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // запускаем один раз после разрешения loading

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="animate-spin w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to use Telegram Web App features
 */
export function useTelegramWebApp() {
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMiniApp(!!window.Telegram?.WebApp);
    }
  }, []);

  const showAlert = (message: string) => {
    if (isMiniApp && window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const hapticFeedback = (type: "success" | "error" | "warning" = "success") => {
    if (isMiniApp && window.Telegram?.WebApp?.hapticFeedback) {
      window.Telegram.WebApp.hapticFeedback.notificationOccurred(type);
    }
  };

  const close = () => {
    if (isMiniApp && window.Telegram?.WebApp) {
      window.Telegram.WebApp.close();
    }
  };

  return { isMiniApp, showAlert, hapticFeedback, close };
}
