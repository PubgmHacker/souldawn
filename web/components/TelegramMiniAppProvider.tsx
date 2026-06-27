"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: any;
        user?: any;
        onEvent: (eventType: string, callback: () => void) => void;
        offEvent: (eventType: string, callback: () => void) => void;
        ready: () => void;
        close: () => void;
        showPopup: (params: any) => void;
        showAlert: (message: string, callback?: () => void) => void;
        hapticFeedback: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
          selectionChanged: () => void;
        };
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isActive: boolean;
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
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
  const [isMiniApp, setIsMiniApp] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();

  const authenticateMiniApp = useCallback(
    async (initData: string) => {
      try {
        const response = await fetch("/api/auth/mini-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ initData }),
        });

        const data = await response.json();

        if (data.success && data.user) {
          // Сессия живёт в httpOnly-куке (sd_access_token), не в localStorage.
          setTimeout(() => {
            router.push("/dashboard");
          }, 500);
        } else {
          console.error("Mini App auth failed:", data.error);
          window.Telegram?.WebApp?.showAlert("Ошибка авторизации");
        }
      } catch (error) {
        console.error("Mini App auth error:", error);
        window.Telegram?.WebApp?.showAlert("Ошибка подключения");
      }
    },
    [router]
  );

  useEffect(() => {
    // Initialize Telegram Web App
    if (typeof window !== "undefined" && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();

      // Set theme colors matching our brand
      tg.setHeaderColor("#0a0a0a");
      tg.setBackgroundColor("#0a0a0a");

      setIsMiniApp(true);
      setIsReady(true);

      // Auto-authenticate if initData exists
      if (tg.initData && !user && !loading) {
        authenticateMiniApp(tg.initData);
      }
    } else {
      setIsReady(true);
    }
  }, [user, loading, authenticateMiniApp]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

  return {
    isMiniApp,
    showAlert,
    hapticFeedback,
    close,
    tg: window.Telegram?.WebApp,
  };
}
