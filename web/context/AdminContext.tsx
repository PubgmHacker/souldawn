"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

interface AdminUser {
  telegram_id?: number | null;
  username: string;
  name: string;
  photo_url?: string;
  role: "owner" | "admin";
}

interface AdminContextType {
  isAuthenticated: boolean;
  currentUser: AdminUser | null;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user && user.is_admin) {
      setCurrentUser({
        telegram_id: user.telegram_id,
        username: user.username,
        name: user.name,
        photo_url: user.photo_url,
        // Роль приходит из БД (назначается сервером по ADMIN_IDS); owner не понижаем.
        role: user.role === "owner" ? "owner" : "admin",
      });
    } else {
      setCurrentUser(null);
    }
  }, [user, loading]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated: !!currentUser,
        currentUser,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
