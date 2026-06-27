"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Look } from "@/lib/lookbook";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";

function formatRub(rub: number) {
  return rub.toLocaleString("ru-RU") + " \u20bd";
}

export default function LookDetail({ look }: { look: Look }) {
  const total = look.items.reduce((s, i) => s + i.price, 0);

  return (
    <main className="min-h-screen bg-bg">
      {/* Hero band */}
      <section className="relative h-[70vh] min-h-[480px] flex items-end overflow-hidden">
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${look.gradient}`}
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        {look.image && (
          <motion.img
            src={look.image}
            alt={look.title}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(${look.accent}22 1px, transparent 1px), linear-gradient(90deg, ${look.accent}22 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
        <motion.div
          className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href="/lookbook"
            className="text-xs font-bold tracking-widest uppercase text-muted hover:text-text transition-colors"
          >
            ← Lookbook
          </Link>
          <span
            className="block mt-6 text-[10px] font-black tracking-[0.25em] uppercase"
            style={{ color: look.accent }}
          >
            {look.subtitle}
          </span>
          <h1 className="font-display mt-2 text-5xl md:text-7xl font-black tracking-tighter uppercase text-text">
            {look.title}
          </h1>
        </motion.div>
      </section>

      {/* Story + pieces */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-[1.2fr_1fr] gap-12 md:gap-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <h2 className="text-xs font-bold tracking-superwide uppercase text-muted mb-6">
            История
          </h2>
          <p className="text-lg md:text-2xl leading-relaxed text-text/90">{look.story}</p>
        </motion.div>

        <motion.div
          variants={staggerContainer(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <h2 className="text-xs font-bold tracking-superwide uppercase text-muted mb-6">
            В образе
          </h2>
          <div className="flex flex-col divide-y divide-line border-y border-line">
            {look.items.map((item) => (
              <motion.div
                key={item.name}
                variants={fadeUp}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <div className="font-bold text-text">{item.name}</div>
                  <div className="text-xs text-muted uppercase tracking-wide">{item.category}</div>
                </div>
                <div className="font-black" style={{ color: look.accent }}>
                  {formatRub(item.price)}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-6">
            <span className="text-xs font-bold tracking-widest uppercase text-muted">Комплект</span>
            <span className="text-2xl font-black text-text">{formatRub(total)}</span>
          </div>
          <Link href="/collection" className="btn-primary mt-8 inline-block w-full text-center">
            Выбрать в каталоге
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
