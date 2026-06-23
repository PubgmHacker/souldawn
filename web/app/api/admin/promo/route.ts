import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function clampPercent(v: unknown): number {
  const n = Math.round(Number(v) || 0);
  return Math.min(100, Math.max(0, n));
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const promos = await prisma.promoCode.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return NextResponse.json({ promos });
}

export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = String(body.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Код обязателен" }, { status: 400 });
  const discountPercent = clampPercent(body.discountPercent ?? body.discount_percent);
  if (discountPercent <= 0) {
    return NextResponse.json({ error: "Процент скидки должен быть 1..100" }, { status: 400 });
  }

  const expiresRaw = body.expiresAt ?? body.expires_at;
  let expiresAt: Date | null = null;
  if (expiresRaw) {
    const d = new Date(String(expiresRaw));
    if (!isNaN(d.getTime())) expiresAt = d;
  }

  try {
    const created = await prisma.promoCode.create({
      data: {
        code,
        discountPercent,
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
        usageLimit: Math.max(0, Math.round(Number(body.usageLimit ?? body.usage_limit) || 0)),
        expiresAt,
      },
    });
    return NextResponse.json({ promo: created }, { status: 201 });
  } catch (e) {
    const msg =
      e instanceof Error && e.message.includes("Unique") ? "Такой код уже есть" : "Не удалось создать";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
