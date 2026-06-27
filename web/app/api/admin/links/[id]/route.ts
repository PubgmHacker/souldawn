import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

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
  if (body.label !== undefined) data.label = String(body.label);
  if (body.url !== undefined) data.url = String(body.url);
  if (body.sortOrder !== undefined) data.sortOrder = Math.round(Number(body.sortOrder) || 0);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  try {
const updated = await prisma.contactLink.update({ where: { id: params.id }, data });


    return NextResponse.json({ link: updated });
  } catch {
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  try {
    await prisma.contactLink.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 400 });
  }
}
