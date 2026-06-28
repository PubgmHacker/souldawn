import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/admin/notifications/[id] — edit notification (title, body, type, isRead)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title);
  if (body.body !== undefined) data.body = String(body.body);
  if (body.type !== undefined) data.type = String(body.type);
  if (body.isRead !== undefined) data.isRead = Boolean(body.isRead);

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  const notif = await db.notification.update({ where: { id }, data });
  return NextResponse.json({ success: true, notification: notif });
}

// DELETE /api/admin/notifications/[id] — delete single notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const { id } = await params;
  await db.notification.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
