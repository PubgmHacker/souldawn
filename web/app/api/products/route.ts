import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapProduct, PUBLIC_CORS } from "@/lib/product-format";

export const dynamic = "force-dynamic";

// Публичный каталог: только активные товары. Читают сайт и мини-апп.
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(
      { products: products.map(mapProduct) },
      { headers: PUBLIC_CORS }
    );
  } catch {
    // На случай отсутствия таблицы/БД — пустой список, фронт перейдёт на fallback.
    return NextResponse.json({ products: [] }, { headers: PUBLIC_CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}
