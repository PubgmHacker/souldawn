/**
 * POST /api/support/notify
 * Бот поддержки отправляет сюда при новом обращении.
 * Сохраняет в Notification (админам) + SupportTicket.
 *
 * GET /api/support/notify — поллинг админом для миниаппа.
 */
import { NextRequest, NextResponse } from "next/server";
import { notifySupportAdmin } from "@/lib/notify";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-bot-secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { user_id, username, name, text, ticket_id } = body as {
    user_id: number;
    username?: string;
    name?: string;
    text: string;
    ticket_id?: string;
  };

  if (!user_id || !text) {
    return NextResponse.json({ error: "user_id and text required" }, { status: 400 });
  }

  await notifySupportAdmin(
    ticket_id || "",
    username || name || String(user_id),
    user_id,
    text,
  );

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const { requireAdmin } = await import("@/lib/admin-auth");
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { prisma } = await import("@/lib/prisma");
  try {
    const notifications = await (prisma as any).notification.findMany({
      where: { type: "support", audience: "admin", read: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ notifications: [] });
  }
}
