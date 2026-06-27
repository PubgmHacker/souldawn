import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/heartbeat
 * Обновляет last_seen пользователя (онлайн-трекинг). Без admin-гарда:
 * вызывается любым авторизованным клиентом с telegram_id.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const telegram_id = body?.telegram_id as number | undefined;
  if (!telegram_id) {
    return NextResponse.json({ error: "telegram_id обязателен" }, { status: 400 });
  }
  try {
    await prisma.user.update({
      where: { telegramId: BigInt(telegram_id) },
      data: { lastSeen: new Date() },
    });
  } catch {
    // юзер может ещё не существовать — игнорируем
  }
  return NextResponse.json({ success: true });
}
