/**
 * SOULDAWN — общий маппинг товара из БД (Prisma) в форму для фронта.
 * Цены хранятся в копейках; фронту отдаём и строку '2 990 ₽', и число.
 */
export function formatKopecks(kopecks: number): string {
  return Math.round((kopecks || 0) / 100).toLocaleString("ru-RU") + " \u20bd";
}

export interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  fullDescription: string;
  price: string;
  priceKopecks: number;
  oldPrice: string | null;
  oldPriceKopecks: number | null;
  category: string;
  images: string[];
  sizes: string[];
  details: string[];
  material: string;
  care: string;
  badge: string | null;
  stock: number;
  inStock: boolean;
}

// Минимальный тип строки товара из Prisma (без импорта PrismaClient-типов).
export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  fullDescription: string;
  priceKopecks: number;
  oldPriceKopecks: number | null;
  category: string;
  images: string[];
  sizes: string[];
  details: string[];
  material: string;
  care: string;
  badge: string | null;
  stock: number;
}

export function mapProduct(p: ProductRow): ApiProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    fullDescription: p.fullDescription,
    price: formatKopecks(p.priceKopecks),
    priceKopecks: p.priceKopecks,
    oldPrice: p.oldPriceKopecks != null ? formatKopecks(p.oldPriceKopecks) : null,
    oldPriceKopecks: p.oldPriceKopecks ?? null,
    category: p.category,
    images: p.images || [],
    sizes: p.sizes || [],
    details: p.details || [],
    material: p.material,
    care: p.care,
    badge: p.badge ?? null,
    stock: p.stock,
    inStock: (p.stock ?? 0) > 0,
  };
}

// CORS — мини-апп живёт на другом origin (GitHub Pages / Telegram).
export const PUBLIC_CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
