import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function keyify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0400-\u04ff]+/g, "-")
      .replace(/^-+|-+$/g, "") || "link"
  );
}

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const links = await prisma.contactLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ links });
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

  const label = String(body.label || "").trim();
  if (!label) return NextResponse.json({ error: "label required" }, { status: 400 });
  const key = String(body.key || keyify(label)).trim();

  try {
    const created = await prisma.contactLink.create({
      data: {
        key,
        label,
        url: String(body.url || ""),
        sortOrder: Math.round(Number(body.sortOrder) || 0),
        isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      },
    });
    return NextResponse.json({ link: created }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique") ? "key уже занят" : "Не удалось создать";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
