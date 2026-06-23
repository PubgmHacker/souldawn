"use client";

import { useEffect, useRef, useState } from "react";

// Ambient loop source. Drop a real optimized loop here to swap the placeholder.
const AUDIO_SRC = "/audio/ambient.mp3";
const STORAGE_KEY = "sd_sound_on";

export default function SoundToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(false);

  // Restore saved preference (default: off). Never autoplay on first visit.
  useEffect(() => {
    setMounted(true);
    try {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce && localStorage.getItem(STORAGE_KEY) === "1") {
        setOn(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Drive playback from state.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (on) {
      el.volume = 0.35;
      void el.play().catch(() => {
        // Autoplay blocked or no source yet — reflect reality in the UI.
        setOn(false);
      });
    } else {
      el.pause();
    }
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [on]);

  // Pause when the tab is hidden; resume when visible (only if enabled).
  useEffect(() => {
    function onVisibility() {
      const el = audioRef.current;
      if (!el) return;
      if (document.hidden) el.pause();
      else if (on) void el.play().catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [on]);

  if (!mounted) return null;

  return (
    <>
      <audio ref={audioRef} src={AUDIO_SRC} loop preload="none" />
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        aria-pressed={on}
        aria-label={on ? "Выключить звук" : "Включить звук"}
        title={on ? "Звук вкл." : "Звук выкл."}
        className="fixed bottom-5 left-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-bg/70 text-text backdrop-blur-md transition-colors hover:border-accent hover:text-accent"
      >
        {on ? (
          // Speaker on
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
        ) : (
          // Speaker muted
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        )}
      </button>
    </>
  );
}
