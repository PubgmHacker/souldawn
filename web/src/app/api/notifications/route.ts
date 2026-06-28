import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/notifications — get user's notifications
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const notifs = await db.notification.findMany({
    where: { userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications: notifs });
}

// POST /api/notifications — mark as read OR create welcome notification
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();

  // Welcome notification on first visit
  if (body.action === "welcome") {
    const existing = await db.notification.findFirst({ where: { userId: auth.userId, type: "welcome" } });
    if (!existing) {
      await db.notification.create({
        data: {
          userId: auth.userId,
          title: "Добро пожаловать в SOULDAWN",
          body: "Подпишись на наш Telegram-канал, чтобы не пропустить новые дропы и промокоды. Рассвет после боя — это твой выбор.",
          type: "welcome",
        },
      });
    }
    return NextResponse.json({ success: true });
  }

  // Mark as read
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}

// DELETE /api/notifications — delete one or clear all
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: "Не авторизован" }, { status: 401 });

  const body = await request.json();

  if (body.clearAll) {
    await db.notification.deleteMany({ where: { userId: auth.userId } });
    return NextResponse.json({ success: true });
  }

  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.notification.delete({ where: { id, userId: auth.userId } });
  return NextResponse.json({ success: true });
}