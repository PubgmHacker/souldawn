"use client";

import { useState, useEffect } from "react";

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[98]"
          onClick={() => setOpen(false)}
          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
        />
      )}

      {/* Widget container */}
      <div
        className="fixed bottom-5 right-5 z-[99]"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        {/* Chat window */}
        {open && (
          <div
            className="mb-4 overflow-hidden"
            style={{
              width: "340px",
              maxWidth: "calc(100vw - 2.5rem)",
              background: "#111111",
              border: "1px solid rgba(201,123,61,0.1)",
              borderRadius: "16px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
              animation: "sdChatIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Header */}
            <div
              className="px-5 py-4"
              style={{
                background: "linear-gradient(135deg, #C97B3D, #D4945A)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 flex items-center justify-center"
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "10px",
                    }}
                  >
                    <span className="text-[11px] font-black text-white tracking-wider">SD</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold tracking-wide uppercase text-white">
                      SOULDAWN
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "#4ADE80",
                          boxShadow: "0 0 6px rgba(74,222,128,0.5)",
                        }}
                      />
                      <p className="text-[10px] text-white/70">Онлайн</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center"
                  style={{
                    background: "rgba(0,0,0,0.15)",
                    borderRadius: "8px",
                    color: "rgba(255,255,255,0.7)",
                  }}
                  aria-label="Закрыть"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="3" y1="3" x2="11" y2="11" />
                    <line x1="11" y1="3" x2="3" y2="11" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex gap-2.5 mb-3">
                <div
                  className="w-7 h-7 flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #C97B3D, #A8632A)",
                    borderRadius: "8px",
                  }}
                >
                  <span className="text-[8px] font-black text-white">SD</span>
                </div>
                <div
                  className="px-3.5 py-2.5 max-w-[250px]"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid rgba(201,123,61,0.08)",
                    borderRadius: "2px 12px 12px 12px",
                  }}
                >
                  <p className="text-[13px] text-text leading-relaxed">
                    Привет! 👋
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 mb-4">
                <div className="w-7 flex-shrink-0" />
                <div
                  className="px-3.5 py-2.5 max-w-[260px]"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid rgba(201,123,61,0.08)",
                    borderRadius: "12px 12px 12px 2px",
                  }}
                >
                  <p className="text-[13px] text-muted leading-relaxed">
                    Нужна помощь с заказом? Напиши нам — ответим быстро 🚀
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div
              className="px-5 py-3"
              style={{
                borderTop: "1px solid rgba(201,123,61,0.06)",
                background: "#0e0e0e",
              }}
            >
              <a
                href="https://t.me/souldawn_support_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 text-white font-bold text-[11px] tracking-wider uppercase"
                style={{
                  background: "linear-gradient(135deg, #C97B3D, #D4945A)",
                  borderRadius: "10px",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Открыть чат
              </a>
            </div>
          </div>
        )}

        {/* Toggle button — круглый, без квадрата, без вращения */}
        <button
          onClick={() => setOpen(!open)}
          className="group relative"
          aria-label="Поддержка"
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: open
              ? "linear-gradient(135deg, #1a1a1a, #222)"
              : "linear-gradient(135deg, #C97B3D, #D4945A)",
            boxShadow: open
              ? "0 2px 12px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.05)"
              : "0 4px 20px rgba(201,123,61,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
            transition: "all 0.3s ease",
            transform: open ? "none" : undefined,
          }}
          onMouseEnter={(e) => {
            if (!open) e.currentTarget.style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {/* Pulse rings — only when closed */}
          {!open && (
            <>
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  animation: "sdPulse 3s ease-in-out infinite",
                  background: "rgba(201,123,61,0.15)",
                }}
              />
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  animation: "sdPulse 3s ease-in-out 1s infinite",
                  background: "rgba(201,123,61,0.1)",
                }}
              />
            </>
          )}

          {/* Icon */}
          {open ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8E4E0" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
