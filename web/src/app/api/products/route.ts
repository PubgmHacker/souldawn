import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allProducts } from "@/lib/products";

export async function GET() {
  try {
    const rows = await db.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });

    if (rows.length > 0) {
      const products = rows.map((p) => ({
        id: p.slug,
        slug: p.slug,
        name: p.name,
        price: `${Math.floor(p.price / 100)} ${p.price % 100 ? (p.price % 100).toString().padStart(2, "0") : ""} ₽`.trim(),
        oldPrice: p.oldPrice ? `${Math.floor(p.oldPrice / 100)} ₽` : null,
        category: p.category,
        gender: p.gender,
        collection: p.collection,
        description: p.description,
        fullDescription: p.fullDescription,
        details: JSON.parse(p.details || "[]"),
        material: p.material,
        care: p.care,
        sizes: JSON.parse(p.sizes || "[]"),
        images: JSON.parse(p.images || "[]"),
        stock: p.stock,
        badge: p.badge || null,
        gradient: p.gradient,
        pattern: p.pattern,
        icon: p.icon,
      }));
      return NextResponse.json({ products });
    }
  } catch (e) {
    console.error("[api/products] DB read failed, using static fallback:", e);
  }

  // Fallback to static products if DB is empty or unavailable
  return NextResponse.json({ products: allProducts });
}
