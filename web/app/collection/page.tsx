"use client";

import { useState, useMemo } from "react";
import CollectionFilter from "@/components/CollectionFilter";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import ScrollReveal from "@/components/ScrollReveal";
import { categories } from "@/lib/products";
import { useProducts } from "@/lib/useProducts";
import { Product, parsePrice } from "@/lib/types";

type LayoutMode = "grid" | "list";
type SortMode = "default" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

export default function CollectionPage() {
  const [activeFilter, setActiveFilter] = useState("Все");
  const [layout, setLayout] = useState<LayoutMode>("grid");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [search, setSearch] = useState("");
  const { products: allProducts } = useProducts();

  const filtered = useMemo(() => {
    let result = allProducts;

    if (activeFilter !== "Все") {
      result = result.filter((p) => p.category === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.material || "").toLowerCase().includes(q),
      );
    }

    if (sortMode !== "default") {
      result = [...result].sort((a, b) => {
        switch (sortMode) {
          case "price-asc":
            return parsePrice(a.price) - parsePrice(b.price);
          case "price-desc":
            return parsePrice(b.price) - parsePrice(a.price);
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          default:
            return 0;
        }
      });
    }

    return result;
  }, [allProducts, activeFilter, search, sortMode]);

  return (
    <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-4">
                Каталог
              </p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight uppercase">
                Все вещи
              </h1>
              <p className="mt-3 text-sm text-muted">
                {filtered.length} {filtered.length === 1 ? "товар" : "товаров"}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-40 md:w-48 pl-9 pr-3 py-2 bg-surface border border-white/10 text-xs text-text placeholder:text-muted/40 focus:outline-none focus:border-accent/40 transition-colors duration-300"
                />
              </div>

              {/* Sort */}
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="bg-surface border border-white/10 px-3 py-2 text-xs text-muted focus:outline-none focus:border-accent/40 transition-colors duration-300 appearance-none cursor-pointer"
              >
                <option value="default">По умолчанию</option>
                <option value="price-asc">Цена: дешевле</option>
                <option value="price-desc">Цена: дороже</option>
                <option value="name-asc">Название: А–Я</option>
                <option value="name-desc">Название: Я–А</option>
              </select>

              {/* Layout toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setLayout("grid")}
                  className={`w-9 h-9 flex items-center justify-center border transition-all duration-300 ${
                    layout === "grid"
                      ? "border-accent text-accent"
                      : "border-white/10 text-muted hover:text-text"
                  }`}
                  aria-label="Сетка"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="0" y="0" width="6" height="6" fill="currentColor" />
                    <rect x="8" y="0" width="6" height="6" fill="currentColor" />
                    <rect x="0" y="8" width="6" height="6" fill="currentColor" />
                    <rect x="8" y="8" width="6" height="6" fill="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={() => setLayout("list")}
                  className={`w-9 h-9 flex items-center justify-center border transition-all duration-300 ${
                    layout === "list"
                      ? "border-accent text-accent"
                      : "border-white/10 text-muted hover:text-text"
                  }`}
                  aria-label="Список"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="0" y="0" width="14" height="3" fill="currentColor" />
                    <rect x="0" y="5.5" width="14" height="3" fill="currentColor" />
                    <rect x="0" y="11" width="14" height="3" fill="currentColor" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Filter */}
        <div className="mt-10">
          <ScrollReveal delay={100}>
            <CollectionFilter
              filters={categories}
              active={activeFilter}
              onChange={setActiveFilter}
            />
          </ScrollReveal>
        </div>

        {/* Grid / List */}
        <div className={`mt-12 ${layout === "grid" ? "grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8" : "flex flex-col gap-4"}`}>
          {filtered.map((product, i) => (
            <ScrollReveal key={product.id} delay={Math.min(i * 60, 400)}>
              <ProductCard product={product} layout={layout} onProductClick={setSelectedProduct} />
            </ScrollReveal>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center mt-20 py-12">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted/20 mx-auto mb-4"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="text-muted text-sm tracking-wider">
              Ничего не найдено
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-accent text-xs mt-3 hover:underline"
              >
                Сбросить поиск
              </button>
            )}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
