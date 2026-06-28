"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

interface Notif {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        setNotifs(d.notifications || []);
        setUnread((d.notifications || []).filter((n: Notif) => !n.isRead).length);
      })
      .catch(() => {});
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotifs((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      const wasRead = prev.find((n) => n.id === id)?.isRead;
      if (!wasRead) setUnread((u) => Math.max(0, u - 1));
      return updated;
    });
  };

  const clearAll = async () => {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearAll: true }),
    });
    setNotifs([]);
    setUnread(0);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-[#6B6B78] hover:text-[#C8C8D0] transition-colors duration-200"
        aria-label="Уведомления"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-[#101014] border border-[rgba(200,200,210,0.12)] overflow-hidden z-50 shadow-xl">
          <div className="px-4 py-3 border-b border-[rgba(200,200,210,0.08)] flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]">
              Уведомления
            </p>
            {notifs.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[9px] font-bold tracking-wider uppercase text-[#6B6B78]/50 hover:text-red-400/70 transition-colors"
              >
                Очистить все
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-[#6B6B78]/60">
                Пока нет уведомлений
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-[rgba(200,200,210,0.05)] hover:bg-[rgba(200,200,210,0.03)] transition-colors relative ${
                    !n.isRead ? "bg-[rgba(200,200,210,0.04)]" : ""
                  }`}
                >
                  <button
                    onClick={(e) => deleteNotif(e, n.id)}
                    className="absolute top-3 right-3 text-[#6B6B78]/30 hover:text-red-400/70 transition-colors p-0.5"
                    aria-label="Удалить"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <p className="text-xs font-bold text-[#E8E8F0] pr-6">{n.title}</p>
                  <p className="text-[11px] text-[#6B6B78] mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[9px] text-[#6B6B78]/40 mt-1">
                    {new Date(n.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
