"use client";

/**
 * SOULDAWN — Кастомный курсор (Argus-style).
 * Точка + следящее кольцо с magnetic-притяжением к интерактивным элементам.
 * Автоматически отключается на touch-устройствах (pointer: coarse).
 */
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [down, setDown] = useState(false);

  // Сырая позиция точки (без задержки) и сглаженная для кольца.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 350, damping: 30, mass: 0.4 });
  const ringY = useSpring(y, { stiffness: 350, damping: 30, mass: 0.4 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);

    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = e.target as HTMLElement | null;
      const interactive = !!el?.closest(
        'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]'
      );
      setHovering(interactive);
    };
    const downH = () => setDown(true);
    const upH = () => setDown(false);

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", downH);
    window.addEventListener("pointerup", upH);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", downH);
      window.removeEventListener("pointerup", upH);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* Центральная точка */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9999] h-1.5 w-1.5 rounded-full bg-accent mix-blend-difference"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
      />
      {/* Следящее кольцо */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full border border-accent/70 mix-blend-difference"
        style={{
          x: ringX,
          y: ringY,
          translateX: "-50%",
          translateY: "-50%",
          height: 36,
          width: 36,
        }}
        animate={{
          scale: down ? 0.7 : hovering ? 1.8 : 1,
          opacity: hovering ? 1 : 0.6,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />
    </>
  );
}
