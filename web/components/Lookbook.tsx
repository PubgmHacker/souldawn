"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LOOKS } from "@/lib/lookbook";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";
import { Gallery4, type Gallery4Item } from "@/components/ui/gallery4";

// Данные лукбука → формат карусели. Для образов без фото используем
// градиент-заглушку через data-URI из accent-цвета (чтобы карточка не была пустой).
const lookItems: Gallery4Item[] = LOOKS.map((look) => ({
  id: look.slug,
  title: look.title,
  description: look.story,
  href: `/lookbook/${look.slug}`,
  image:
    look.image ||
    `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800'%3E%3Crect width='100%25' height='100%25' fill='%230F0F11'/%3E%3C/svg%3E`,
}));

export default function Lookbook() {
  return (
    <section className="section-padding bg-surface">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex items-center gap-6 mb-14"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <div className="h-[1px] flex-1 bg-white/10" />
          <h2 className="text-xs font-bold tracking-superwide uppercase text-muted">
            Lookbook
          </h2>
          <div className="h-[1px] flex-1 bg-white/10" />
        </motion.div>

        {/* Карусель образов (Embla) — горизонтальный drag не блокирует скролл страницы */}
        <Gallery4 items={lookItems} />

        <motion.div
          className="mt-4 text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <Link
            href="/lookbook"
            className="text-xs font-bold tracking-widest uppercase text-muted hover:text-accent transition-colors duration-300"
          >
            Смотреть все образы →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
