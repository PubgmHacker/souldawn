import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/admin/products/[id] — update product
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  // Separate relational fields from scalars
  const data: Record<string, unknown> = {};
  const allowed = [
    "slug", "name", "price", "oldPrice", "category", "gender", "collection",
    "description", "fullDescription", "material", "care", "stock", "badge",
    "gradient", "pattern", "icon", "tag", "active",
  ];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === "price" || key === "oldPrice" || key === "stock") {
        data[key] = body[key] !== null ? Number(body[key]) : null;
      } else if (key === "active") {
        data[key] = Boolean(body[key]);
      } else {
        data[key] = String(body[key]);
      }
    }
  }

  // Handle array fields — serialize to JSON strings
  if (body.details !== undefined)
    data.details = Array.isArray(body.details) ? JSON.stringify(body.details) : String(body.details);
  if (body.sizes !== undefined)
    data.sizes = Array.isArray(body.sizes) ? JSON.stringify(body.sizes) : String(body.sizes);
  if (body.images !== undefined)
    data.images = Array.isArray(body.images) ? JSON.stringify(body.images) : String(body.images);

  const product = await db.product.update({ where: { id }, data });
  return NextResponse.json({ success: true, product });
}

// DELETE /api/admin/products/[id] — soft delete (set active=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.product.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}
