import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function clampPercent(v: unknown): number {
  const n = Math.round(Number(v) || 0);
  return Math.min(100, Math.max(0, n));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.code !== undefined) data.code = String(body.code).trim().toUpperCase();
  if (body.discountPercent !== undefined || body.discount_percent !== undefined) {
    data.discountPercent = clampPercent(body.discountPercent ?? body.discount_percent);
  }
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  if (body.usageLimit !== undefined || body.usage_limit !== undefined) {
    data.usageLimit = Math.max(0, Math.round(Number(body.usageLimit ?? body.usage_limit) || 0));
  }
  if (body.expiresAt !== undefined || body.expires_at !== undefined) {
    const raw = body.expiresAt ?? body.expires_at;
    if (!raw) {
      data.expiresAt = null;
    } else {
      const d = new Date(String(raw));
      data.expiresAt = isNaN(d.getTime()) ? null : d;
    }
  }

  try {
    const updated = await prisma.promoCode.update({ where: { id }, data });
    return NextResponse.json({ promo: updated });
  } catch (e) {
    const msg =
      e instanceof Error && e.message.includes("Unique") ? "Такой код уже есть" : "Не удалось обновить";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;

  try {
    await prisma.promoCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 400 });
  }
}
