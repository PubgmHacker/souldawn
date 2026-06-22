"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { staggerContainer, charReveal, fadeUp, EASE } from "@/lib/motion";

const WORD_SOUL = "SOUL".split("");
const WORD_DAWN = "DAWN".split("");

/**
 * SOULDAWN — Hero.
 * Строгий тёмный фон, без WebGL/неона/параллакса (производительность + бренд).
 * Анимация — только дешёвый stagger-reveal текста на старте.
 */
export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Строгий статичный фон: лёгкий тёплый акцент снизу, без анимации */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 110%, rgba(232,184,122,0.16) 0%, rgba(168,106,61,0.06) 35%, transparent 65%), linear-gradient(180deg, #08080A 0%, #0C0C0F 60%, #08080A 100%)",
        }}
      />
      {/* Тонкая верхняя линия-затемнение для глубины */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/40 to-transparent"
      />

      {/* Content */}
      <motion.div
        className="relative z-10 text-center px-6"
        variants={staggerContainer(0.06, 0.1)}
        initial="hidden"
        animate="visible"
      >
        <motion.p
          variants={fadeUp}
          className="text-xs md:text-sm font-bold tracking-superwide uppercase text-accent mb-6"
        >
          Уличная культура × Спорт
        </motion.p>

        <h1 className="font-display text-7xl md:text-9xl lg:text-[11rem] tracking-tight uppercase leading-[0.85]">
          <span className="flex justify-center overflow-hidden">
            {WORD_SOUL.map((c, i) => (
              <motion.span key={`s${i}`} variants={charReveal} className="block text-text">
                {c}
              </motion.span>
            ))}
          </span>
          <span className="flex justify-center overflow-hidden">
            {WORD_DAWN.map((c, i) => (
              <motion.span key={`d${i}`} variants={charReveal} className="block text-gradient">
                {c}
              </motion.span>
            ))}
          </span>
        </h1>

        <motion.p
          variants={fadeUp}
          className="mt-8 text-sm md:text-base text-muted max-w-md mx-auto leading-relaxed tracking-wide"
        >
          Твоя одежда — это отражение твоей внутренней борьбы
        </motion.p>

        <motion.p
          variants={fadeUp}
          className="mt-4 text-[11px] md:text-xs font-bold tracking-superwide uppercase text-accent/80"
        >
          Рассвет после боя
        </motion.p>

        <motion.div variants={fadeUp} className="mt-12 flex items-center justify-center gap-4">
          <Link href="/collection" className="btn-primary">
            Смотреть коллекцию
          </Link>
          <Link href="/lookbook" className="btn-outline">
            Lookbook
          </Link>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.8, ease: EASE }}
      >
        <motion.div
          className="w-[1px] h-12 bg-gradient-to-b from-transparent to-accent"
          animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>
    </section>
  );
}
