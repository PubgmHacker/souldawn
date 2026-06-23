"use client";

/**
 * SOULDAWN — Колокольчик уведомлений.
 * Показывается в Header для авторизованных пользователей.
 * Поллинг каждые 30с.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

interface Notification {
  id: string;
  type: string;
  audience: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  welcome: "🌅",
  promo:   "🎁",
  order:   "📦",
  payment: "💳",
  support: "💬",
  system:  "⚡",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen]   = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifs = useCallback(async () => {
    if (!user) return; // Не поллингить без авторизации
    try {
      const r = await fetch("/api/notifications", { credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.notifications || []);
      setUnread(d.unreadCount || 0);
    } catch {}
  }, [user]);

  // Поллинг каждые 30с — только если авторизован
  useEffect(() => {
    if (!user) return;
    fetchNotifs();
    const t = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(t);
  }, [fetchNotifs, user]);

  // Закрыть по клику вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Кнопка */}
      <button
        onClick={() => { setOpen((v) => !v); if (!open && unread > 0) markAllRead(); }}
        className="relative w-9 h-9 flex items-center justify-center text-muted hover:text-accent transition-colors duration-300"
        aria-label="Уведомления"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-bg text-[9px] font-black flex items-center justify-center rounded-full"
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </button>

      {/* Панель */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-12 w-80 glass-strong rounded-xl shadow-card z-[200] overflow-hidden"
          >
            {/* Заголовок */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <span className="text-xs font-bold tracking-widest uppercase text-muted">
                Уведомления
              </span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-accent hover:underline"
                >
                  Отметить все
                </button>
              )}
            </div>

            {/* Список */}
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-muted">
                  Нет уведомлений
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-line/50 transition-colors ${
                      !n.read ? "bg-accent/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-base mt-0.5 flex-shrink-0">
                        {TYPE_ICON[n.type] || "⚡"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-text">{n.title}</p>
                        <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-muted/40 mt-1">
                          {new Date(n.createdAt).toLocaleString("ru-RU", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
