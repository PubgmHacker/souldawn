"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";
import { fadeUp, viewportOnce } from "@/lib/motion";

export type { Product };

interface ProductCardProps {
  product: Product;
  layout?: "grid" | "list";
  onProductClick?: (product: Product) => void;
}

/* ── Product Silhouettes ─────────────────────────── */

function ProductIcon({ icon, className }: { icon: string; className?: string }) {
  const cls = className || "w-full h-full";

  switch (icon) {
    case "tee":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M60 40 L40 55 L25 50 L30 80 L55 75 L55 165 L145 165 L145 75 L170 80 L175 50 L160 55 L140 40 L120 35 C115 50 85 50 80 35 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M80 35 C85 55 115 55 120 35" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <line x1="100" y1="50" x2="100" y2="80" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        </svg>
      );
    case "hoodie":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M60 35 L35 50 L20 45 L25 85 L55 80 L55 170 L145 170 L145 80 L175 85 L180 45 L165 50 L140 35 L120 28 C115 15 85 15 80 28 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M80 28 C82 42 118 42 120 28" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <path d="M80 28 C78 18 70 12 65 15 L60 35" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
          <path d="M120 28 C122 18 130 12 135 15 L140 35" stroke="currentColor" strokeWidth="1" opacity="0.3" fill="none" />
          <rect x="75" y="100" width="50" height="35" rx="5" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <line x1="100" y1="35" x2="100" y2="55" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        </svg>
      );
    case "pants":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M55 30 L55 35 L145 35 L145 30 Z" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          <path d="M55 35 L50 170 L85 170 L100 100 L115 170 L150 170 L145 35 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <line x1="55" y1="50" x2="145" y2="50" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <path d="M95 35 L95 60" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <path d="M105 35 L105 60" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <rect x="110" y="55" width="15" height="18" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
        </svg>
      );
    case "cap":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M50 110 C50 70 70 45 100 40 C130 45 150 70 150 110"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M40 110 C35 105 35 95 50 110 L150 110 C165 95 165 105 160 110 L155 115 C150 112 50 112 45 115 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M90 40 C88 30 92 22 100 20 C108 22 112 30 110 40"
            stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <line x1="100" y1="40" x2="100" y2="105" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
        </svg>
      );
    case "bomber":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M60 35 L35 50 L20 45 L25 85 L50 80 L50 155 L150 155 L150 80 L175 85 L180 45 L165 50 L140 35 L120 28 C115 18 85 18 80 28 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <line x1="100" y1="28" x2="100" y2="155" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <circle cx="100" cy="45" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
          <circle cx="100" cy="65" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
          <circle cx="100" cy="85" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
          <path d="M50 145 L150 145" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          <rect x="140" y="50" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
        </svg>
      );
    case "socks":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M75 30 L75 110 C75 130 60 145 55 155 L45 165 C40 170 50 180 65 175 L90 168 L100 145 L100 30 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M75 50 L100 50" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
          <path d="M75 65 L100 65" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <path d="M75 80 L100 80" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <path d="M75 95 L100 95" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        </svg>
      );
    case "bag":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M60 70 L60 155 L140 155 L140 70 Z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M75 70 L75 55 C75 35 85 25 100 25 C115 25 125 35 125 55 L125 70"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <line x1="60" y1="90" x2="140" y2="90" stroke="currentColor" strokeWidth="0.8" opacity="0.25" />
          <rect x="85" y="105" width="30" height="20" rx="3" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
        </svg>
      );
    case "wraps":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M60 60 C70 55 90 55 100 60 C110 65 130 65 140 60"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M60 60 L55 145 C55 155 65 160 75 155 L95 145 L105 145 L125 155 C135 160 145 155 145 145 L140 60"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M60 80 L140 80" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <path d="M58 100 L142 100" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <path d="M56 120 L144 120" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
          <path d="M60 80 L55 100" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
          <path d="M140 80 L145 100" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
        </svg>
      );
    case "longsleeve":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M65 40 L40 50 L15 90 L35 95 L55 70 L55 165 L145 165 L145 70 L165 95 L185 90 L160 50 L135 40 L118 35 C115 48 85 48 82 35 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M82 35 C85 52 115 52 118 35" stroke="currentColor" strokeWidth="1" opacity="0.3" />
        </svg>
      );
    case "cargo":
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <path d="M55 30 L55 35 L145 35 L145 30 Z" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          <path d="M55 35 L50 170 L85 170 L100 100 L115 170 L150 170 L145 35 Z"
            stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.6" />
          <rect x="56" y="55" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
          <rect x="56" y="90" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
          <rect x="126" y="55" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
          <rect x="126" y="90" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 200 200" fill="none" className={cls}>
          <rect x="50" y="40" width="100" height="120" rx="4" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        </svg>
      );
  }
}

/* ── Main Component ──────────────────────────────── */

export default function ProductCard({ product, layout = "grid", onProductClick }: ProductCardProps) {
  const [hovered, setHovered] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const { addItem } = useCart();
  // Sold-out по реальному остатку, с fallback на текстовый tag.
  const stock = typeof product.stock === "number" ? product.stock : null;
  const isSoldOut = stock !== null ? stock <= 0 : product.tag === "Нет в наличии";

  const handleAddToCart = (size: string) => {
    const ok = addItem(product, size);
    if (!ok) {
      setLimitHit(true);
      setTimeout(() => setLimitHit(false), 1800);
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleCardClick = () => {
    onProductClick?.(product);
  };

  const defaultSize = product.sizes?.[0] || "Универсальный";

  /* ── List layout ── */
  if (layout === "list") {
    return (
      <div
        className="group relative flex gap-5 md:gap-7 p-4 md:p-5 border border-white/[0.04] hover:border-accent/20 bg-surface/40 hover:bg-surface/70 transition-all duration-500 cursor-pointer overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleCardClick}
      >
        {/* Left accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top" />

        {/* Image */}
        <div className={`w-24 h-32 md:w-28 md:h-36 flex-shrink-0 bg-gradient-to-br ${product.gradient} relative overflow-hidden`}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 96px, 112px"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 group-hover:text-white/60 transition-colors duration-500">
              <ProductIcon icon={product.icon || "tee"} className="w-16 h-16 md:w-20 md:h-20" />
            </div>
          )}
          {product.tag && product.tag !== "Нет в наличии" && (
            <span className="absolute top-2 left-2 text-[8px] font-black tracking-widest px-2 py-0.5 bg-accent text-bg">
              {product.tag}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted/60">{product.category}</span>
            <h3 className="text-sm md:text-[15px] font-bold tracking-wide uppercase text-text group-hover:text-accent transition-colors duration-300 mt-0.5">
              {product.name}
            </h3>
            {product.description && (
              <p className="text-[11px] text-muted/70 mt-1.5 line-clamp-2 leading-relaxed">{product.description}</p>
            )}
            {product.sizes && (
              <div className="flex gap-1 mt-2">
                {product.sizes.map((size) => (
                  <span key={size} className="text-[8px] font-bold tracking-wider text-muted/50 border border-white/[0.06] px-1.5 py-0.5">
                    {size}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-accent">{product.price}</span>
              {product.oldPrice && (
                <span className="text-[11px] text-muted/50 line-through">{product.oldPrice}</span>
              )}
            </div>
            {!isSoldOut && (
              <button
                onClick={(e) => { e.stopPropagation(); handleAddToCart(defaultSize); }}
                className={`text-[9px] font-black tracking-[0.15em] uppercase px-4 py-1.5 border transition-all duration-300 ${
                  added
                    ? "border-green-500/50 text-green-400 bg-green-500/5"
                    : "border-white/[0.08] text-muted hover:border-accent/40 hover:text-accent"
                }`}
              >
                {added ? "Добавлено ✓" : "В корзину"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Grid layout ── */
  return (
    <motion.div
      className="group cursor-pointer"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setSelectedSize(null); }}
      onClick={handleCardClick}
    >
      {/* Image area */}
      <div className={`aspect-[3/4] bg-gradient-to-br ${product.gradient} relative overflow-hidden rounded-xl transition-shadow duration-500 group-hover:shadow-glow`}>
        {/* Real photo (falls back to silhouette icon when absent).
            With a second photo (e.g. back print), cross-fade to it on hover. */}
        {product.image || product.images?.length ? (
          <>
            {/* Skeleton пока изображение грузится */}
            <div className="absolute inset-0 bg-white/5 animate-pulse" aria-hidden />
            <Image
              src={(product.images?.[0] || product.image) as string}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 64vw, (max-width: 1024px) 38vw, 24vw"
              className={`object-cover transition-all duration-700 group-hover:scale-105 ${
                product.images?.[1] && hovered ? "opacity-0" : "opacity-100"
              }`}
            />
            {product.images?.[1] && (
              <Image
                src={product.images[1]}
                alt={`${product.name} — вид сзади`}
                fill
                sizes="(max-width: 640px) 64vw, (max-width: 1024px) 38vw, 24vw"
                className={`object-cover transition-all duration-700 group-hover:scale-105 ${
                  hovered ? "opacity-100" : "opacity-0"
                }`}
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/20 group-hover:text-white/35 transition-all duration-700 group-hover:scale-110">
            <ProductIcon icon={product.icon || "tee"} className="w-28 h-28 md:w-36 md:h-36" />
          </div>
        )}

        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} />

        {/* Tag */}
        {product.tag && (
          <span className={`absolute top-3 left-3 text-[8px] font-black tracking-[0.15em] px-2.5 py-1 z-10 ${
            product.tag === "Нет в наличии"
              ? "bg-white/15 text-white/50 backdrop-blur-sm"
              : product.tag === "Скидка"
              ? "bg-accent-red text-white"
              : "bg-accent text-bg"
          }`}>
            {product.tag}
          </span>
        )}

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/50 to-transparent flex flex-col items-center justify-end pb-8 gap-3 transition-all duration-500 ${
          hovered ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          {/* Sizes */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="flex gap-1.5">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={(e) => { e.stopPropagation(); setSelectedSize(size); }}
                  className={`min-w-[32px] h-8 text-[9px] font-bold tracking-wider border transition-all duration-200 ${
                    selectedSize === size
                      ? "border-accent text-accent bg-accent/10"
                      : "border-white/20 text-white/60 hover:border-white/40 hover:text-white/80"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          )}

          {/* Add to cart */}
          {!isSoldOut && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddToCart(selectedSize || defaultSize);
              }}
              className={`px-10 py-2.5 text-[10px] font-black tracking-[0.15em] uppercase transition-all duration-300 ${
                added
                  ? "bg-green-500 text-bg"
                  : "bg-accent text-bg hover:bg-white"
              }`}
            >
              {added ? "Добавлено ✓" : "В корзину"}
            </button>
          )}

          {isSoldOut && (
            <span className="text-[10px] font-black tracking-[0.15em] uppercase text-white/30">
              Нет в наличии
            </span>
          )}
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />

        {/* Corner brand mark */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-20 transition-opacity duration-500">
          <span className="text-[7px] font-black tracking-[0.3em] uppercase text-white block">SOUL</span>
          <span className="text-[7px] font-black tracking-[0.3em] uppercase text-accent block">DAWN</span>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3.5 pb-2 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-muted/50 block mb-0.5">
              {product.category}
            </span>
            <h3 className="text-[13px] font-bold tracking-wide uppercase text-text group-hover:text-accent transition-colors duration-300">
              {product.name}
            </h3>
          </div>
        </div>

        {product.description && (
          <p className="text-[11px] text-muted/50 mt-1 line-clamp-1">{product.description}</p>
        )}

        <div className="flex items-center gap-2 mt-2">
          <span className="text-[13px] font-black text-accent">{product.price}</span>
          {product.oldPrice && (
            <span className="text-[11px] text-muted/40 line-through">{product.oldPrice}</span>
          )}
        </div>

        {/* Underline */}
        <div className="absolute bottom-0 left-0 h-[1px] bg-accent/40 w-0 group-hover:w-full transition-all duration-500" />
      </div>
    </motion.div>
  );
}
