import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { mapProduct } from "@/lib/product-format";

export const dynamic = "force-dynamic";

const BADGES = ["NEW", "HIT", "SALE"];

type Params = { params: { id: string } };

export async function GET(request: NextRequest, { params }: Params) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product: mapProduct(product) });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name);
  if (body.slug !== undefined) data.slug = String(body.slug).trim();
  if (body.description !== undefined) data.description = String(body.description);
  if (body.fullDescription !== undefined) data.fullDescription = String(body.fullDescription);
  if (body.priceKopecks !== undefined) data.priceKopecks = Math.max(0, Math.round(Number(body.priceKopecks) || 0));
  if (body.oldPriceKopecks !== undefined)
    data.oldPriceKopecks =
      body.oldPriceKopecks != null && Number(body.oldPriceKopecks) > 0
        ? Math.round(Number(body.oldPriceKopecks))
        : null;
  if (body.category !== undefined) data.category = String(body.category);
  if (body.images !== undefined) data.images = Array.isArray(body.images) ? body.images.map(String) : [];
  if (body.sizes !== undefined) data.sizes = Array.isArray(body.sizes) ? body.sizes.map(String) : [];
  if (body.details !== undefined) data.details = Array.isArray(body.details) ? body.details.map(String) : [];
  if (body.material !== undefined) data.material = String(body.material);
  if (body.care !== undefined) data.care = String(body.care);
  if (body.badge !== undefined) data.badge = BADGES.includes(String(body.badge)) ? String(body.badge) : null;
  if (body.stock !== undefined) data.stock = Math.max(0, Math.round(Number(body.stock) || 0));
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.sortOrder !== undefined) data.sortOrder = Math.round(Number(body.sortOrder) || 0);

  try {
    const updated = await prisma.product.update({ where: { id: params.id }, data });
    return NextResponse.json({ product: mapProduct(updated) });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 400 });
  }
}
