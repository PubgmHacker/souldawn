"use client";

/**
 * SOULDAWN — загрузка каталога из /api/products с fallback на статику.
 * Бэкенд — источник истины; если БД/API недоступны — показываем встроенный список.
 */
import { useEffect, useState } from "react";
import { allProducts } from "@/lib/products";
import { Product } from "@/lib/types";

interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  fullDescription: string;
  price: string;
  oldPrice: string | null;
  category: string;
  images: string[];
  sizes: string[];
  details: string[];
  material: string;
  care: string;
  badge: "NEW" | "HIT" | "SALE" | null;
  stock: number;
}

function toProduct(p: ApiProduct): Product {
  return {
    id: p.slug || p.id,
    name: p.name,
    price: p.price,
    oldPrice: p.oldPrice || undefined,
    category: p.category,
    description: p.description || undefined,
    fullDescription: p.fullDescription || undefined,
    details: p.details,
    material: p.material || undefined,
    care: p.care || undefined,
    sizes: p.sizes,
    image: p.images?.[0],
    images: p.images,
    stock: p.stock,
    badge: p.badge,
    gradient: "from-surface via-[#1a1510] to-accent/30",
    icon: "tee",
  };
}

export function useProducts(): { products: Product[]; loading: boolean } {
  const [products, setProducts] = useState<Product[]>(allProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!alive) return;
        const list: ApiProduct[] = Array.isArray(data?.products) ? data.products : [];
        if (list.length) setProducts(list.map(toProduct));
      })
      .catch(() => {
        /* keep static fallback */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { products, loading };
}
