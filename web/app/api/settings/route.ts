import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_CORS } from "@/lib/product-format";

export const dynamic = "force-dynamic";

// Публичные контактные ссылки (футер сайта и мини-апп).
export async function GET() {
  try {
    const links = await prisma.contactLink.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(
      { links: links.map((l) => ({ key: l.key, label: l.label, url: l.url })) },
      { headers: PUBLIC_CORS }
    );
  } catch {
    return NextResponse.json({ links: [] }, { headers: PUBLIC_CORS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS });
}
