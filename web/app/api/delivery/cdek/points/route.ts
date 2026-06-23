import { NextRequest, NextResponse } from "next/server";
import { findPvz, resolveCityCode } from "@/lib/cdek";

export const dynamic = "force-dynamic";

/**
 * GET /api/delivery/cdek/points?city=Москва&postal_code=101000&city_code=44
 * Возвращает пункты выдачи СДЭК с координатами для отображения на Картах.
 * Если city_code не передан — разрешается по названию города/индексу.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || undefined;
  const postalCode = searchParams.get("postal_code") || undefined;
  let cityCode = searchParams.get("city_code")
    ? Number(searchParams.get("city_code"))
    : undefined;

  if (!cityCode && (city || postalCode)) {
    const resolved = await resolveCityCode({ city, postalCode });
    cityCode = resolved ?? undefined;
  }

  if (!cityCode && !postalCode) {
    return NextResponse.json({ points: [], city_code: null });
  }

  const points = await findPvz({ cityCode, postalCode });
  return NextResponse.json({ points, city_code: cityCode ?? null });
}
