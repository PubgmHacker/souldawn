"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";
import ProductCard, { Product } from "./ProductCard";
import ProductModal from "./ProductModal";
import { allProducts } from "@/lib/products";

const featured = allProducts.filter((p) =>
  ["dawn-runner-tee", "concrete-shade-hoodie", "dawnbreak-bomber", "struggle-cap"].includes(p.id)
);

export default function FeaturedCollection() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <section className="section-padding bg-bg">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <ScrollReveal>
          <div className="flex items-center gap-6 mb-12">
            <div className="h-[1px] flex-1 bg-white/10" />
            <h2 className="text-xs font-bold tracking-superwide uppercase text-muted">
              Избранное
            </h2>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>
        </ScrollReveal>

        {/* Products grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {featured.map((product, i) => (
            <ScrollReveal key={product.id} delay={i * 100}>
              <ProductCard product={product} onProductClick={setSelectedProduct} />
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </section>
  );
}
