"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";

const values = [
  {
    title: "Аутентичность",
    text: "Наследие улиц. Мы не притворяемся — мы живём тем, что носим.",
  },
  {
    title: "Борьба",
    text: "Борьба — это топливо. Каждый шов, каждый силуэт создан для тех, кто не сдаётся.",
  },
  {
    title: "Рассвет",
    text: "Рассвет приходит после самой долгой ночи. Мы — для тех, кто ждёт своего часа.",
  },
];

export default function BrandPhilosophy() {
  return (
    <section className="section-padding bg-surface">
      <motion.div
        className="max-w-7xl mx-auto"
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        <motion.p
          variants={fadeUp}
          className="text-xs font-bold tracking-superwide uppercase text-accent mb-6"
        >
          Наша философия
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="font-display text-5xl md:text-7xl tracking-tight uppercase leading-[0.9] max-w-4xl"
        >
          Одежда, рождённая
          <br />
          <span className="text-accent">внутренней борьбой</span>
        </motion.h2>

        <motion.p
          variants={fadeUp}
          className="mt-10 max-w-2xl text-base md:text-lg text-muted leading-relaxed"
        >
          Мы не придумали эту борьбу. Мы просто решили показать её. SOULDAWN —
          это спорт. Как характер. Как действие. Как состояние.
        </motion.p>

        <motion.div
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12"
          variants={staggerContainer(0.12)}
        >
          {values.map((v) => (
            <motion.div key={v.title} variants={fadeUp} className="border-t border-white/10 pt-8">
              <h3 className="font-display text-2xl tracking-wide uppercase text-text mb-4">
                {v.title}
              </h3>
              <p className="text-sm text-muted leading-relaxed">{v.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
