"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

/**
 * Wraps every route so navigations animate in with a subtle fade + rise.
 * Next.js remounts template.tsx on each navigation, so this runs per page.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
