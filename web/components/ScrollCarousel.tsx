"use client";

/**
 * SOULDAWN — 3D карусель коллекции.
 * Использует реальные товары из БД через useProducts.
 * 3D-эффект: rotateY + perspective + whileHover подъём.
 * Параллакс секции при скролле через useScroll/useTransform.
 */
import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { EASE } from "@/lib/motion";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import { useProducts } from "@/lib/useProducts";
import type { Product } from "@/lib/types";

export default function ScrollCarousel() {
  const { products } = useProducts();
  const [selected, setSelected] = useState<Product | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Параллакс всей секции
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [30, -30]);

  const items = products.slice(0, 8);

  const scrollBy = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section ref={ref} className="section-padding bg-bg overflow-hidden">
      <motion.div style={{ y }}>
        <div className="max-w-7xl mx-auto">
          {/* Заголовок */}
          <motion.div
            className="flex items-center gap-6 mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div>
              <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-2">Коллекция</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
                <span className="text-text">АНГЕЛ </span>
                <span className="dawn-text">VS ДЕМОН</span>
              </h2>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                aria-label="Назад"
                onClick={() => scrollBy(-1)}
                className="h-9 w-9 flex items-center justify-center border border-line text-muted hover:text-accent hover:border-accent transition-colors"
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Вперёд"
                onClick={() => scrollBy(1)}
                className="h-9 w-9 flex items-center justify-center border border-line text-muted hover:text-accent hover:border-accent transition-colors"
              >
                →
              </button>
            </div>
          </motion.div>

          {/* 3D-карусель */}
          <div
            ref={scrollerRef}
            className="flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory pb-6 -mx-6 px-6 scroll-smooth"
            style={{ scrollbarWidth: "none" }}
          >
            {items.map((product, i) => (
              <motion.div
                key={product.id}
                className="snap-start shrink-0 w-[64vw] sm:w-[38vw] lg:w-[24vw]"
                initial={{ opacity: 0, y: 40, rotateY: -12 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, delay: i * 0.07, ease: EASE }}
                whileHover={{ y: -8, scale: 1.02, rotateY: 3 }}
                style={{ transformStyle: "preserve-3d", perspective: 900 }}
              >
                <ProductCard product={product} onProductClick={(p) => setSelected(p)} />
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
