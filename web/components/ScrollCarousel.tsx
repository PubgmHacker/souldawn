"use client";

/**
 * SOULDAWN — Горизонтальная лента коллекции.
 * Строгая, производительная версия БЕЗ scroll-hijacking:
 * - вертикальная прокрутка страницы НЕ блокируется;
 * - лента листается свайпом/драгом/колесом ТОЛЬКО внутри блока;
 * - scroll-snap для аккуратной остановки на карточках.
 */
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import { useProducts } from "@/lib/useProducts";
import type { Product } from "@/lib/types";
import { EASE } from "@/lib/motion";

export default function ScrollCarousel() {
  const { products } = useProducts();
  const [selected, setSelected] = useState<Product | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const items = products.slice(0, 8);
  const openModal = (p: Product) => setSelected(p);

  const scrollBy = (dir: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="section-padding bg-bg">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="flex items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <div className="h-[1px] flex-1 bg-white/10" />
          <h2 className="text-xs font-bold tracking-superwide uppercase text-muted whitespace-nowrap">
            Коллекция
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Назад"
              onClick={() => scrollBy(-1)}
              className="h-9 w-9 flex items-center justify-center border border-white/10 text-muted hover:text-accent hover:border-accent transition-colors"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Вперёд"
              onClick={() => scrollBy(1)}
              className="h-9 w-9 flex items-center justify-center border border-white/10 text-muted hover:text-accent hover:border-accent transition-colors"
            >
              →
            </button>
          </div>
        </motion.div>

        <div
          ref={scrollerRef}
          className="mt-10 flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory pb-6 -mx-6 px-6 scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((product) => (
            <div
              key={product.id}
              className="snap-start shrink-0 w-[64vw] sm:w-[38vw] lg:w-[24vw]"
            >
              <ProductCard product={product} onProductClick={openModal} />
            </div>
          ))}
        </div>
      </div>

      {selected && <ProductModal product={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
