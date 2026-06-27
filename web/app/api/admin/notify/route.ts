import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/notify
 * Обновляет флаги уведомлений пользователя по telegram_id.
 */
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { telegram_id, notify_new_drops, notify_promos } = body as {
    telegram_id?: number;
    notify_new_drops?: boolean;
    notify_promos?: boolean;
  };
  if (!telegram_id) {
    return NextResponse.json({ error: "telegram_id обязателен" }, { status: 400 });
  }

  const data: Record<string, boolean> = {};
  if (typeof notify_new_drops === "boolean") data.notifyNewDrops = notify_new_drops;
  if (typeof notify_promos === "boolean") data.notifyPromos = notify_promos;

  await prisma.user.update({ where: { telegramId: BigInt(telegram_id) }, data });
  return NextResponse.json({ success: true });
}
