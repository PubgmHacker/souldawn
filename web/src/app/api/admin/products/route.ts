import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/products — list all products (including inactive)
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.product.findMany({ orderBy: { createdAt: "asc" } });
  const products = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    oldPrice: p.oldPrice,
    category: p.category,
    gender: p.gender,
    collection: p.collection,
    description: p.description,
    fullDescription: p.fullDescription,
    details: p.details,
    material: p.material,
    care: p.care,
    sizes: p.sizes,
    images: p.images,
    stock: p.stock,
    badge: p.badge,
    gradient: p.gradient,
    pattern: p.pattern,
    icon: p.icon,
    tag: p.tag,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return NextResponse.json({ products });
}

// POST /api/admin/products — create product
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const {
    slug, name, price, oldPrice, category, gender, collection,
    description, fullDescription, details, material, care,
    sizes, images, stock, badge, gradient, pattern, icon, tag,
  } = body;

  if (!slug || !name || !price) {
    return NextResponse.json({ error: "slug, name, price обязательны" }, { status: 400 });
  }

  const product = await db.product.create({
    data: {
      slug,
      name,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      category: category || "",
      gender: gender || "Унисекс",
      collection: collection || "",
      description: description || "",
      fullDescription: fullDescription || "",
      details: Array.isArray(details) ? JSON.stringify(details) : details || "[]",
      material: material || "",
      care: care || "",
      sizes: Array.isArray(sizes) ? JSON.stringify(sizes) : sizes || "[]",
      images: Array.isArray(images) ? JSON.stringify(images) : images || "[]",
      stock: Number(stock) || 0,
      badge: badge || "",
      gradient: gradient || "",
      pattern: pattern || "",
      icon: icon || "tee",
      tag: tag || "",
    },
  });

  return NextResponse.json({ success: true, product });
}
