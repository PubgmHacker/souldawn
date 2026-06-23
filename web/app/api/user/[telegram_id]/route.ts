import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/[telegram_id]
 * Читает пользователя из Prisma по telegram_id (раньше проксировал на bot-server).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ telegram_id: string }> }
) {
  const { telegram_id } = await params;
  if (!/^\d+$/.test(telegram_id)) {
    return NextResponse.json({ error: "Некорректный telegram_id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(telegram_id) } });
  if (!user) {
    return NextResponse.json({ error: "Не найден" }, { status: 404 });
  }

  const profile = (user.profileData as Record<string, any>) || {};
  return NextResponse.json({
    id: String(user.id),
    telegram_id: Number(user.telegramId),
    username: user.username || "",
    name: user.fullName || "",
    photo_url: profile.photo_url || null,
    role: user.role,
    is_admin: user.role === "admin" || user.role === "owner" || user.isAdmin,
    notify_new_drops: user.notifyNewDrops,
    notify_promos: user.notifyPromos,
  });
}
