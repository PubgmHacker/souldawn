export interface Product {
  id: string;
  name: string;
  price: string;
  oldPrice?: string;
  category: string;
  description?: string;
  fullDescription?: string;
  details?: string[];
  material?: string;
  care?: string;
  sizes?: string[];
  tag?: string;
  image?: string;
  images?: string[]; // реальные фото (перёд, зад, ...)
  stock?: number; // остаток; 0 = нет в наличии
  badge?: "NEW" | "HIT" | "SALE" | null; // угловой бейдж
  gradient: string;
  pattern?: "lines" | "dots" | "cross" | "none";
  icon?:
    | "tee"
    | "hoodie"
    | "pants"
    | "cap"
    | "bomber"
    | "socks"
    | "bag"
    | "wraps"
    | "longsleeve"
    | "cargo";
}

export interface CartItem {
  product: Product;
  size: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number;
}

export interface Contact {
  phone: string;
  name?: string;
  email?: string;
}

export function parsePrice(priceStr: string): number {
  return parseInt(priceStr.replace(/[^\d]/g, ""), 10) || 0;
}

export function formatPrice(amount: number): string {
  return amount.toLocaleString("ru-RU") + " ₽";
}
