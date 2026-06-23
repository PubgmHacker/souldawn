"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Product, CartItem, parsePrice } from "@/lib/types";

export type { CartItem };

interface CartContextType {
  items: CartItem[];
  // Возвращает false, если добавить нельзя (исчерпан остаток).
  addItem: (product: Product, size: string) => boolean;
  removeItem: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

// Доступный остаток товара. undefined/отсутствие stock трактуем как без ограничения.
function maxStock(product: Product): number {
  return typeof product.stock === "number" ? product.stock : Infinity;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((product: Product, size: string): boolean => {
    const limit = maxStock(product);
    let ok = true;
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.product.id === product.id && i.size === size
      );
      const currentQty = existing?.quantity ?? 0;
      // Остаток исчерпан — не добавляем.
      if (currentQty + 1 > limit) {
        ok = false;
        return prev;
      }
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.size === size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, size, quantity: 1 }];
    });
    return ok;
  }, []);

  const removeItem = useCallback((productId: string, size: string) => {
    setItems((prev) => prev.filter(
      (i) => !(i.product.id === productId && i.size === size)
    ));
  }, []);

  const updateQuantity = useCallback((productId: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter(
        (i) => !(i.product.id === productId && i.size === size)
      ));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.product.id === productId && i.size === size) {
          // Ограничиваем доступным остатком.
          const limit = maxStock(i.product);
          return { ...i, quantity: Math.min(quantity, limit) };
        }
        return i;
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const totalPrice = items.reduce((sum, i) => {
    return sum + parsePrice(i.product.price) * i.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
