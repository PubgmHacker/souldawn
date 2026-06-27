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
  notify_new_drops: boolean;
  notify_promos: boolean;
  notify_email?: boolean;
  email_verified?: boolean;
  profile_data?: Record<string, any>;
  created_at?: string;
  last_login?: string;
  last_seen?: string;
}

export interface Order {
  id: string;
  items: { name: string; size?: string; qty: number; price: number }[];
  total: number; // копейки
  status: string;
  created_at: string | null;
  tracking?: string;
}

/** Единый формат цены: копейки → ₽. */
export function formatPrice(kopecks: number): string {
  return (kopecks / 100).toLocaleString("ru-RU", { maximumFractionDigits: 0 });
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
  loginWithWidget: (widgetData: Record<string, any>) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, username?: string) => Promise<{ error?: string }>;
  updateProfile: (patch: Record<string, any>) => Promise<{ error?: string }>;
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

  // При монтировании: восстанавливаем сессию ТОЛЬКО из httpOnly-куки через /api/auth/me.
  // Никакого доверия localStorage — это подделываемый клиентский стейт.
  const loadMe = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setOrders(Array.isArray(data.orders) ? data.orders : []);
          return true;
        }
      }
    } catch {}
    setUser(null);
    setOrders([]);
    return false;
  }, []);

  useEffect(() => {
    (async () => {
      await loadMe();
      setLoading(false);
    })();
  }, [loadMe]);

  // Login через Telegram Login Widget (обычный сайт).
  const loginWithWidget = useCallback(
    async (widgetData: Record<string, any>) => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(widgetData),
        });
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          if (data.token) setToken(data.token);
          router.push("/dashboard");
        }
      } catch (e) {
        console.error("Auth failed:", e);
      }
    },
    [router]
  );

  // Login через Mini App initData (Telegram WebApp).
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
          router.push("/dashboard");
        }
      } catch (e) {
        console.error("Mini App auth failed:", e);
      }
    },
    [router]
  );

  const loginWithEmail = useCallback(async (email: string, password: string) => {
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
      setToken(data.token);
      router.push("/dashboard");
      return {};
    } catch {
      return { error: "Ошибка сети" };
    }
  }, [router]);

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
        setToken(data.token);
        router.push("/dashboard");
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
    } catch {}
    return false;
  }, []);

  // Авто-обновление токена ~каждые 24ч (за 5 мин до истечения).
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetch("/api/auth/refresh", { method: "POST", credentials: "include" }).catch(() => {});
    }, (24 * 60 - 5) * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const refreshUser = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  // Self-service обновление профиля через PATCH /api/user.
  const updateProfile = useCallback(
    async (patch: Record<string, any>) => {
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
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
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
