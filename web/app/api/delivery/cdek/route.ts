import { NextRequest, NextResponse } from "next/server";
import { calcDelivery } from "@/lib/cdek";

/**
 * POST /api/delivery/cdek
 * Тело: { city_code?, postal_code?, region?, total_qty }
 * Возвращает стоимость (копейки) и срок доставки СДЭК.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const totalQty = Math.max(1, Math.floor(Number(body?.total_qty ?? 1)));
  const quote = await calcDelivery({
    cityCode: body?.city_code ? Number(body.city_code) : undefined,
    postalCode: body?.postal_code ? String(body.postal_code) : undefined,
    region: body?.region ? String(body.region) : undefined,
    totalQty,
  });

  return NextResponse.json(quote);
}
