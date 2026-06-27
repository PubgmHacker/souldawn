"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Product } from "@/lib/types";
import { useCart } from "@/context/CartContext";

interface ProductModalProps {
  product: Product;
  onClose: () => void;
}

/* ── Product Silhouette (copied from ProductCard for modal) ── */
function ProductIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className || "w-full h-full";
  const icons: Record<string, JSX.Element> = {
    tee: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M60 40 L40 55 L25 50 L30 80 L55 75 L55 165 L145 165 L145 75 L170 80 L175 50 L160 55 L140 40 L120 35 C115 50 85 50 80 35 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M80 35 C85 55 115 55 120 35" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
    hoodie: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M60 35 L35 50 L20 45 L25 85 L55 80 L55 170 L145 170 L145 80 L175 85 L180 45 L165 50 L140 35 L120 28 C115 15 85 15 80 28 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M80 28 C82 42 118 42 120 28" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        <rect x="75" y="100" width="50" height="35" rx="5" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
    pants: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M55 35 L145 35 L145 30 L55 30 Z" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <path d="M55 35 L50 170 L85 170 L100 100 L115 170 L150 170 L145 35 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
    ),
    cap: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M50 110 C50 70 70 45 100 40 C130 45 150 70 150 110" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M40 110 C35 105 35 95 50 110 L150 110 C165 95 165 105 160 110 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
    ),
    bomber: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M60 35 L35 50 L20 45 L25 85 L50 80 L50 155 L150 155 L150 80 L175 85 L180 45 L165 50 L140 35 L120 28 C115 18 85 18 80 28 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
        <line x1="100" y1="28" x2="100" y2="155" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      </svg>
    ),
    socks: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M75 30 L75 110 C75 130 60 145 55 155 L45 165 C40 170 50 180 65 175 L90 168 L100 145 L100 30 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
    ),
    bag: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M60 70 L60 155 L140 155 L140 70 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M75 70 L75 55 C75 35 85 25 100 25 C115 25 125 35 125 55 L125 70" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
    ),
    wraps: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M60 60 C70 55 90 55 100 60 C110 65 130 65 140 60" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M60 60 L55 145 C55 155 65 160 75 155 L95 145 L105 145 L125 155 C135 160 145 155 145 145 L140 60" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
    ),
    longsleeve: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M65 40 L40 50 L15 90 L35 95 L55 70 L55 165 L145 165 L145 70 L165 95 L185 90 L160 50 L135 40 L118 35 C115 48 85 48 82 35 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
      </svg>
    ),
    cargo: (
      <svg viewBox="0 0 200 200" fill="none" className={cls}>
        <path d="M55 35 L145 35 L145 30 L55 30 Z" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <path d="M55 35 L50 170 L85 170 L100 100 L115 170 L150 170 L145 35 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
        <rect x="56" y="55" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
        <rect x="126" y="55" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      </svg>
    ),
  };
  return icons[icon || "tee"] || icons.tee;
}

/* ── Modal ── */
export default function ProductModal({ product, onClose }: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const isSoldOut = product.tag === "Нет в наличии";
  const defaultSize = product.sizes?.[0] || "Универсальный";

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  /* close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAdd = () => {
    addItem(product, selectedSize || defaultSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg/85 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-4xl max-h-[90vh] glass-strong rounded-2xl shadow-card overflow-y-auto animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-muted hover:text-text transition-colors duration-300"
          aria-label="Закрыть"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="2" x2="16" y2="16" />
            <line x1="16" y1="2" x2="2" y2="16" />
          </svg>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* ── Left: Image ── */}
          <div className={`relative aspect-[3/4] md:aspect-auto bg-gradient-to-br ${product.gradient} flex items-center justify-center`}>
            {product.image ? (
              <>
                {/* Skeleton */}
                <div className="absolute inset-0 bg-white/5 animate-pulse" aria-hidden />
                <Image
                  src={product.images?.[0] || product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </>
            ) : (
              <div className="text-white/25">
                <ProductIcon icon={product.icon || "tee"} className="w-48 h-48 md:w-64 md:h-64" />
              </div>
            )}

            {/* Noise */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }} />

            {/* Tag */}
            {product.tag && (
              <span className={`absolute top-5 left-5 text-[9px] font-black tracking-[0.15em] px-3 py-1 ${
                product.tag === "Скидка" ? "bg-accent-red text-white" : "bg-accent text-bg"
              }`}>
                {product.tag}
              </span>
            )}

            {/* Brand mark */}
            <div className="absolute bottom-5 left-5 opacity-20">
              <span className="text-[8px] font-black tracking-[0.3em] uppercase text-white block">SOUL</span>
              <span className="text-[8px] font-black tracking-[0.3em] uppercase text-accent block">DAWN</span>
            </div>
          </div>

          {/* ── Right: Info ── */}
          <div className="p-6 md:p-8 flex flex-col">
            {/* Category */}
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted/50">
              {product.category}
            </span>

            {/* Name */}
            <h2 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-text mt-1">
              {product.name}
            </h2>

            {/* Price */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xl font-black text-accent">{product.price}</span>
              {product.oldPrice && (
                <span className="text-sm text-muted/40 line-through">{product.oldPrice}</span>
              )}
            </div>

            {/* Short description */}
            <p className="text-sm text-muted/70 mt-4 leading-relaxed">
              {product.description}
            </p>

            {/* Full description */}
            {product.fullDescription && (
              <p className="text-[13px] text-muted/50 mt-3 leading-relaxed">
                {product.fullDescription}
              </p>
            )}

            {/* Divider */}
            <div className="h-[1px] bg-white/[0.06] my-5" />

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted/50 block mb-3">
                  Размер
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[44px] h-10 text-[11px] font-bold tracking-wider border transition-all duration-200 ${
                        selectedSize === size
                          ? "border-accent text-accent bg-accent/10"
                          : "border-white/[0.08] text-muted hover:border-white/20 hover:text-text"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add to cart */}
            <div className="mt-6">
              {!isSoldOut ? (
                <button
                  onClick={handleAdd}
                  className={`w-full py-3.5 text-[11px] font-black tracking-[0.15em] uppercase transition-all duration-300 ${
                    added
                      ? "bg-green-500 text-bg"
                      : "bg-accent text-bg hover:bg-white"
                  }`}
                >
                  {added ? "Добавлено в корзину ✓" : "Добавить в корзину"}
                </button>
              ) : (
                <div className="w-full py-3.5 text-center text-[11px] font-black tracking-[0.15em] uppercase text-muted/30 border border-white/[0.06]">
                  Нет в наличии
                </div>
              )}
            </div>

            {/* Details */}
            {product.details && product.details.length > 0 && (
              <div className="mt-6">
                <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-muted/50 block mb-3">
                  Особенности
                </span>
                <ul className="space-y-1.5">
                  {product.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-muted/60">
                      <span className="text-accent mt-0.5 text-[8px]">◆</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Material & Care */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              {product.material && (
                <div>
                  <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted/40 block mb-1">
                    Материал
                  </span>
                  <p className="text-[12px] text-muted/60">{product.material}</p>
                </div>
              )}
              {product.care && (
                <div>
                  <span className="text-[9px] font-bold tracking-[0.15em] uppercase text-muted/40 block mb-1">
                    Уход
                  </span>
                  <p className="text-[12px] text-muted/60">{product.care}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
