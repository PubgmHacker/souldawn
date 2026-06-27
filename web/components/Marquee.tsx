"use client";

import { useEffect, useRef } from "react";

const items = [
  "БОРЬБА",
  "·",
  "АУТЕНТИЧНОСТЬ",
  "·",
  "РАССВЕТ",
  "·",
  "COLLECTION 2026",
  "·",
  "STREETWEAR",
  "·",
  "OVERSIZED FIT",
  "·",
  "YKK HARDWARE",
  "·",
  "100% COTTON",
  "·",
  "FREE SHIPPING 5000₽+",
  "·",
  "SOULDAWN",
  "·",
];

export default function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    // Duplicate content for seamless loop
    track.innerHTML += track.innerHTML;
  }, []);

  return (
    <div className="relative overflow-hidden bg-accent py-3 select-none">
      <div
        ref={trackRef}
        className="flex gap-6 whitespace-nowrap animate-marquee"
        style={{ width: "max-content" }}
      >
        {items.map((item, i) => (
          <span
            key={i}
            className={`text-[11px] font-black tracking-[0.2em] uppercase ${
              item === "·" ? "text-bg/40" : "text-bg"
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
