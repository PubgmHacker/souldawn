"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";

const timeline = [
  {
    phase: "Ночь",
    title: "Страх и тень",
    text: "Каждый путь начинается в темноте. Мы знаем, что значит быть одним наедине со своими демонами.",
  },
  {
    phase: "Борьба",
    title: "Закалка",
    text: "Сталь закаляется огнём. Мы создаём одежду для тех, кто превращает боль в движение.",
  },
  {
    phase: "Рассвет",
    title: "Восход",
    text: "После самой долгой ночи всегда восходит солнце. SOULDAWN — для тех, кто дошёл до утра.",
  },
];

const values = [
  { icon: "◆", label: "Аутентичность" },
  { icon: "◆", label: "Борьба" },
  { icon: "◆", label: "Рассвет" },
  { icon: "◆", label: "Сообщество" },
];

export default function AboutPage() {
  return (
    <div className="pt-28 pb-20">
      {/* Hero */}
      <section className="section-padding">
        <motion.div
          className="max-w-7xl mx-auto"
          variants={staggerContainer(0.15)}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-bold tracking-superwide uppercase text-accent mb-6"
          >
            О бренде
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase leading-none"
          >
            Рождён<br />
            <span className="text-gradient">в борьбе</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-10 text-base md:text-lg text-muted max-w-2xl leading-relaxed"
          >
            SOULDAWN — это не просто одежда. Это манифест для тех, кто прошёл
            через тьму и вышел на свет. Мы создаём одежду, которая отражает
            внутреннюю борьбу каждого из нас — потому что рассвет приходит
            только тем, кто не спрятался от ночи.
          </motion.p>
        </motion.div>
      </section>

      {/* Values */}
      <section className="section-padding bg-surface">
        <div className="max-w-7xl mx-auto">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="text-xs font-bold tracking-superwide uppercase text-accent mb-12"
          >
            Наши ценности
          </motion.p>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            variants={staggerContainer(0.1)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {values.map((v) => (
              <motion.div key={v.label} variants={fadeUp} className="text-center">
                <span className="text-3xl text-accent block mb-4">{v.icon}</span>
                <h3 className="text-sm font-bold tracking-widest uppercase text-text">
                  {v.label}
                </h3>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding">
        <div className="max-w-7xl mx-auto">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            className="text-xs font-bold tracking-superwide uppercase text-accent mb-12"
          >
            Наш путь
          </motion.p>

          <motion.div
            className="space-y-16"
            variants={staggerContainer(0.18)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {timeline.map((item) => (
              <motion.div
                key={item.phase}
                variants={fadeUp}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-12 items-start"
              >
                <div className="md:col-span-3">
                  <p className="text-xs font-bold tracking-widest uppercase text-accent">
                    {item.phase}
                  </p>
                </div>
                <div className="md:col-span-9 border-t border-line pt-6">
                  <h3 className="text-2xl md:text-3xl font-black tracking-tight uppercase mb-4">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed max-w-lg">{item.text}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quote */}
      <section className="section-padding bg-surface">
        <motion.div
          className="max-w-7xl mx-auto text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <blockquote className="font-display text-2xl md:text-4xl font-black tracking-tight uppercase leading-tight max-w-3xl mx-auto">
            &ldquo;Рассвет принадлежит тем, кто<br />
            <span className="text-gradient">пережил ночь.&rdquo;</span>
          </blockquote>
          <p className="mt-8 text-xs tracking-widest uppercase text-muted">— SOULDAWN</p>
        </motion.div>
      </section>
    </div>
  );
}
