/**
 * GET  /api/notifications  — получить уведомления для текущего пользователя
 * POST /api/notifications  — создать уведомление (только админ / бот)
 * PATCH /api/notifications — отметить как прочитанные
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// Типы уведомлений
export type NotifType =
  | "welcome"   // приветствие новому пользователю
  | "promo"     // промокод / акция
  | "order"     // изменение статуса заказа
  | "payment"   // оплата подтверждена
  | "support"   // новое обращение (админам)
  | "system";   // системное

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const telegramId = user.telegramId ? BigInt(user.telegramId) : null;
  const isAdmin    = user.role === "admin" || user.role === "owner" || user.isAdmin;

  try {
    const where: any = {
      OR: [
        // Личные уведомления
        ...(telegramId ? [{ telegramId, audience: "user" }] : []),
        // Броадкаст всем пользователям
        { telegramId: null, audience: "user" },
        // Админские уведомления
        ...(isAdmin ? [{ audience: "admin" }] : []),
      ],
    };

    const notifications = await (prisma as any).notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}

export async function POST(request: NextRequest) {
  // Проверяем секрет бота или админ
  const secret = request.headers.get("x-bot-secret");
  const isBot  = secret && secret === process.env.WEBHOOK_SECRET;

  if (!isBot) {
    const { requireAdmin } = await import("@/lib/admin-auth");
    const admin = requireAdmin(request);
    if (admin instanceof NextResponse) return admin;
  }

  const body = await request.json() as {
    type: NotifType;
    audience: "user" | "admin" | "all";
    telegramId?: number;
    title: string;
    body: string;
    meta?: Record<string, unknown>;
  };

  try {
    const audiences = body.audience === "all" ? ["user", "admin"] : [body.audience];
    for (const audience of audiences) {
      await (prisma as any).notification.create({
        data: {
          type:       body.type,
          audience,
          telegramId: body.telegramId ? BigInt(body.telegramId) : null,
          title:      body.title,
          body:       body.body,
          meta:       body.meta || null,
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json() as { ids?: string[] };

  try {
    if (ids?.length) {
      await (prisma as any).notification.updateMany({
        where: { id: { in: ids } },
        data:  { read: true },
      });
    } else {
      // Отметить все свои
      const telegramId = user.telegramId ? BigInt(user.telegramId) : null;
      await (prisma as any).notification.updateMany({
        where: { telegramId, read: false },
        data:  { read: true },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
