/**
 * SOULDAWN — shared Framer Motion presets.
 * Keep animation timing/feel consistent across the site.
 */
import type { Variants } from "framer-motion";

// Default viewport for scroll-triggered reveals (animate once).
export const viewportOnce = { once: true, amount: 0.2 } as const;

export const EASE = [0.22, 1, 0.36, 1] as const; // easeOutExpo-ish

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.9, ease: EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

// Container that staggers its children's reveal.
export const staggerContainer = (stagger = 0.12, delay = 0): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

// Word/letter reveal for headings.
export const charReveal: Variants = {
  hidden: { opacity: 0, y: "0.6em" },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE },
  },
};
