"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import ScrollReveal from "@/components/ScrollReveal";

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24 min-h-screen flex flex-col items-center justify-center">
        <ScrollReveal>
          <div className="flex flex-col items-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted/30 mb-6"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase mb-4">
              Корзина пуста
            </h1>
            <p className="text-sm text-muted mb-8">
              Самое время найти то, что откликается на твою борьбу.
            </p>
            <Link href="/collection" className="btn-primary">
              Смотреть каталог
            </Link>
          </div>
        </ScrollReveal>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <ScrollReveal>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-4">
                Корзина
              </p>
              <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight uppercase">
                Твой пакет
              </h1>
              <p className="mt-3 text-sm text-muted">
                {totalItems} {totalItems === 1 ? "товар" : "товаров"}
              </p>
            </div>
            <button
              onClick={clearCart}
              className="text-xs font-bold tracking-widest uppercase text-muted hover:text-accent-red transition-colors duration-300 mb-2"
            >
              Очистить всё
            </button>
          </div>
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, i) => (
              <ScrollReveal key={`${item.product.id}-${item.size}`} delay={i * 80}>
                <div className="flex gap-4 md:gap-6 p-4 md:p-6 border border-white/5 bg-surface/50 hover:border-white/10 transition-all duration-300">
                  {/* Image */}
                  <div className={`w-20 h-28 md:w-28 md:h-36 flex-shrink-0 bg-gradient-to-br ${item.product.gradient} relative`}>
                    {item.product.pattern === "lines" && (
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,255,255,0.1) 8px, rgba(255,255,255,0.1) 9px)"
                      }} />
                    )}
                    {item.product.pattern === "dots" && (
                      <div className="absolute inset-0 opacity-15" style={{
                        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                        backgroundSize: "12px 12px"
                      }} />
                    )}
                    {item.product.pattern === "cross" && (
                      <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%), linear-gradient(-45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%)",
                        backgroundSize: "20px 20px"
                      }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <span className="text-[10px] font-bold tracking-widest uppercase text-muted">
                        {item.product.category}
                      </span>
                      <h3 className="text-sm md:text-base font-bold tracking-wide uppercase text-text truncate">
                        {item.product.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold tracking-wider text-muted border border-white/10 px-2 py-0.5">
                          Размер: {item.size}
                        </span>
                        {typeof item.product.stock === "number" &&
                          item.quantity >= item.product.stock && (
                            <span className="text-[10px] font-bold tracking-wider text-accent-red">
                              Максимум: {item.product.stock} шт.
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity */}
                      <div className="flex items-center border border-white/10">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.size, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-all duration-200"
                        >
                          −
                        </button>
                        <span className="w-10 h-8 flex items-center justify-center text-xs font-bold text-text border-x border-white/10">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.size, item.quantity + 1)}
                          disabled={
                            typeof item.product.stock === "number" &&
                            item.quantity >= item.product.stock
                          }
                          className="w-8 h-8 flex items-center justify-center text-muted hover:text-text hover:bg-white/5 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-accent">
                          {(parseFloat(item.product.price.replace(/\s/g, '').replace("₽", "")) * item.quantity).toLocaleString("ru-RU")} ₽
                        </span>
                        <button
                          onClick={() => removeItem(item.product.id, item.size)}
                          className="text-[10px] font-bold tracking-widest uppercase text-muted hover:text-accent-red transition-colors duration-300"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <ScrollReveal delay={200}>
              <div className="sticky top-28 glass-strong rounded-2xl p-6 md:p-8 shadow-card">
                <h2 className="text-xs font-bold tracking-widest uppercase text-muted mb-6">
                  Итого
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Товары ({totalItems})</span>
                    <span className="text-text font-bold">{totalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Доставка</span>
                    <span className="text-muted">рассчитается при оформлении</span>
                  </div>
                  <div className="h-[1px] bg-white/10 my-2" />
                  <div className="flex justify-between">
                    <span className="text-sm font-bold text-text">Итого</span>
                    <span className="text-lg font-black text-accent">{totalPrice.toLocaleString("ru-RU")} ₽</span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="btn-primary w-full mt-8 block text-center"
                >
                  Оформить заказ
                </Link>

                <Link
                  href="/collection"
                  className="btn-outline w-full mt-3 block text-center"
                >
                  Продолжить покупки
                </Link>

                {/* Trust badges */}
                <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="text-[11px] text-muted">Безопасная оплата</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    <span className="text-[11px] text-muted">Доставка СДЭК по всей стране</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                    </svg>
                    <span className="text-[11px] text-muted">Возврат в течение 30 дней</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </div>
  );
}
