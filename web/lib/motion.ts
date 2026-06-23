/**
 * SOULDAWN — shared Framer Motion presets.
 */
import type { Variants } from "framer-motion";

export const viewportOnce = { once: true, amount: 0.2 } as const;
export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.9, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

export const staggerContainer = (stagger = 0.12, delay = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

export const charReveal: Variants = {
  hidden: { opacity: 0, y: "0.6em" },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

// ── Новые пресеты (GML Фаза 2) ──────────────────────────────────────────────

export const dawnReveal: Variants = {
  hidden: { opacity: 0, y: 48, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: EASE } },
};

export const magneticHover = {
  scale: 1.04,
  transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
};

export const parallaxY = (offset = 60): Variants => ({
  hidden: { y: offset },
  visible: { y: -offset, transition: { duration: 1.2, ease: EASE } },
});

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -48 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 48 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: EASE } },
};
