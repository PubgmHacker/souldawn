import { NextRequest, NextResponse } from "next/server";
import { applyPromoFromDb } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * POST /api/validate-promo — валидация промокода по БД (с fallback на хардкод).
 * Ожидает { code, total } — total в копейках.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const total = Number(body?.total || 0);
  const result = await applyPromoFromDb(body?.code || "", total);
  if (!result.valid && result.error === "Введите промокод") {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
