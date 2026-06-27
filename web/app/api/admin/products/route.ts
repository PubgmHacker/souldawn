import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { mapProduct } from "@/lib/product-format";

export const dynamic = "force-dynamic";

const BADGES = ["NEW", "HIT", "SALE"];

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0400-\u04ff]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

// GET — все товары (включая неактивные) для админки.
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({
    products: products.map((p) => ({ ...mapProduct(p), isActive: p.isActive, sortOrder: p.sortOrder })),
  });
}

// POST — создать товар.
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const slug = String(body.slug || slugify(name)).trim();
  const badge = BADGES.includes(String(body.badge)) ? String(body.badge) : null;

  try {
    const created = await prisma.product.create({
      data: {
        slug,
        name,
        description: String(body.description || ""),
        fullDescription: String(body.fullDescription || ""),
        priceKopecks: Math.max(0, Math.round(Number(body.priceKopecks) || 0)),
        oldPriceKopecks:
          body.oldPriceKopecks != null && Number(body.oldPriceKopecks) > 0
            ? Math.round(Number(body.oldPriceKopecks))
            : null,
        category: String(body.category || ""),
        images: Array.isArray(body.images) ? body.images.map(String) : [],
        sizes: Array.isArray(body.sizes) ? body.sizes.map(String) : [],
        details: Array.isArray(body.details) ? body.details.map(String) : [],
        material: String(body.material || ""),
        care: String(body.care || ""),
        badge,
        stock: Math.max(0, Math.round(Number(body.stock) || 0)),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        sortOrder: Math.round(Number(body.sortOrder) || 0),
      },
    });
    return NextResponse.json({ product: mapProduct(created) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "slug уже занят" : "Не удалось создать";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
