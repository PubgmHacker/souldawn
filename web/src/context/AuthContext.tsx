"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export interface User {
  id?: string;
  telegram_id?: number | null;
  username: string;
  name: string;
  email?: string | null;
  photo_url?: string;
  role?: string;
  is_admin: boolean;
  is_active?: boolean;
  notify_new_drops: boolean;
  notify_promos: boolean;
  notify_email?: boolean;
  email_verified?: boolean;
  profile_data?: Record<string, unknown>;
  created_at?: string;
  last_login?: string;
  last_seen?: string;
}

export interface Order {
  id: string;
  cipher: string;
  items: { name: string; size?: string; qty: number; price: number }[];
  total: number;
  subtotal: number;
  deliveryCost: number;
  discountAmount: number;
  promoCode: string | null;
  status: string;
  created_at: string | null;
  tracking: string | null;
  itemNames: string;
  itemsCount: number;
  deliveryType: string;
  deliveryCity: string;
  pvzAddress: string;
  deliveryAddress: string;
}

/** Format price: rubles → ₽. */
export function formatPrice(rubles: number): string {
  return rubles.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    telegramId: number,
    username: string,
    name: string,
    photoUrl?: string,
    initData?: string
  ) => Promise<void>;
  loginWithWidget: (widgetData: Record<string, unknown>) => Promise<void>;
  loginWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error?: string }>;
  register: (
    email: string,
    password: string,
    username?: string
  ) => Promise<{ error?: string }>;
  updateProfile: (patch: Record<string, unknown>) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  orders: Order[];
  isAdmin: boolean;
  isOwner: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadMe = useCallback(async (overrideToken?: string | null): Promise<boolean> => {
    try {
      const hdrs: Record<string, string> = { "Cache-Control": "no-cache" };
      if (overrideToken) hdrs["Authorization"] = "Bearer " + overrideToken;
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        headers: hdrs,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setOrders(Array.isArray(data.orders) ? data.orders : []);
          return true;
        }
      }
    } catch (e) {
      console.error("[loadMe] failed:", e);
    }
    setUser(null);
    setOrders([]);
    return false;
  }, []);

  useEffect(() => {
    (async () => {
      // ── Cross-origin SSO bridge ──────────────────────────────────────
      // When opened from the Telegram Mini App, the URL carries ?token=<jwt>.
      // Exchange it for httpOnly cookies before anything else, then strip it.
      let bridged = false;
      if (typeof window !== "undefined") {
        const u = new URL(window.location.href);
        const t = u.searchParams.get("token");
        if (t) {
          try {
            const r = await fetch("/api/auth/from-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ token: t }),
            });
            if (r.ok) bridged = true;
          } catch (e) {
            console.error("[sso-bridge] failed:", e);
          }
          u.searchParams.delete("token");
          window.history.replaceState({}, "", u.pathname + u.search + u.hash);
        }
      }

      const hasSession = await loadMe();
      if (!hasSession && !bridged && typeof window !== "undefined") {
        try {
          const tg = (window as any)?.Telegram?.WebApp;
          if (tg?.initData) {
            tg.ready();
            tg.expand();
            const res = await fetch("/api/auth/mini-app", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ initData: tg.initData }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.user) {
                if (data.token) setToken(data.token);
                const verified = await loadMe(data.token);
                if (!verified) setUser(data.user);
                // Redirect to admin if ?view=admin in URL
                const u = new URL(window.location.href);
                const view = u.searchParams.get("view");
                if (view === "admin" && (data.user.is_admin || data.user.role === "admin" || data.user.role === "owner")) {
                  u.searchParams.delete("view");
                  window.history.replaceState({}, "", u.pathname + u.search);
                  router.push("/admin");
                  return;
                }
                return;
              }
            } else {
              console.error("[mini-app] response status:", res.status);
            }
          } else {
            console.log("[mini-app] no initData available");
          }
        } catch (e) {
          console.error("[mini-app] auth error:", e);
        }
      }
      setLoading(false);
    })();
  }, [loadMe]);

  const loginWithWidget = useCallback(
    async (widgetData: Record<string, unknown>) => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(widgetData),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          console.error("[telegram-auth] server error:", res.status, data);
          alert("Не удалось войти через Telegram: " + (data.error || `ошибка ${res.status}`));
          return;
        }
        if (data.user) {
          if (data.token) setToken(data.token);
          // Re-fetch session via /me to make sure cookies are set before navigation
          const ok = await loadMe(data.token);
          if (!ok) setUser(data.user);
          const isAdminUser =
            data.user.is_admin || data.user.role === "admin" || data.user.role === "owner";
          router.push(isAdminUser ? "/admin" : "/dashboard");
        }
      } catch (e) {
        console.error("Auth failed:", e);
        alert("Сетевая ошибка авторизации. Проверьте подключение и попробуйте снова.");
      }
    },
    [router, loadMe]
  );

  const login = useCallback(
    async (
      _telegramId: number,
      _username: string,
      _name: string,
      _photoUrl?: string,
      initData?: string
    ) => {
      if (!initData) return;
      try {
        const res = await fetch("/api/auth/mini-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ initData }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          if (data.token) setToken(data.token);
          // Redirect admins to admin panel, others to dashboard
          if (data.user.is_admin || data.user.role === "admin" || data.user.role === "owner") {
            router.push("/admin");
          } else {
            router.push("/dashboard");
          }
        }
      } catch (e) {
        console.error("Mini App auth failed:", e);
      }
    },
    [router]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return { error: data.error || "Ошибка входа" };
        setUser(data.user);
        if (data.token) setToken(data.token);
        // Redirect admins to admin panel
        if (data.user.is_admin || data.user.role === "admin" || data.user.role === "owner") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        return {};
      } catch {
        return { error: "Ошибка сети" };
      }
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string, username?: string) => {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, username }),
        });
        const data = await res.json();
        if (!res.ok) return { error: data.error || "Ошибка регистрации" };
        setUser(data.user);
        if (data.token) setToken(data.token);
        if (data.user.is_admin || data.user.role === "admin" || data.user.role === "owner") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        return {};
      } catch {
        return { error: "Ошибка сети" };
      }
    },
    [router]
  );

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }, (24 * 60 - 5) * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const refreshUser = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const updateProfile = useCallback(
    async (patch: Record<string, unknown>) => {
      try {
        const res = await fetch("/api/user", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok) return { error: data.error || "Ошибка обновления" };
        if (data.user) setUser(data.user);
        return {};
      } catch {
        return { error: "Ошибка сети" };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setUser(null);
    setOrders([]);
    setToken(null);
    router.push("/");
  }, [router]);

  const isAdmin = user?.is_admin || false;
  const isOwner = user?.role === "owner";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithWidget,
        loginWithEmail,
        register,
        updateProfile,
        logout,
        refreshUser,
        refreshToken,
        orders,
        isAdmin,
        isOwner,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}