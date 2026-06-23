import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/admin/users/[telegram_id]
 * Обновляет роль / активность / флаги уведомлений пользователя.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ telegram_id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { telegram_id } = await params;
  const body = await request.json();
  const { role, is_active, notify_new_drops, notify_promos } = body as {
    role?: string;
    is_active?: boolean;
    notify_new_drops?: boolean;
    notify_promos?: boolean;
  };

  const data: Record<string, any> = {};
  if (role && ["user", "admin", "owner"].includes(role)) {
    data.role = role;
    data.isAdmin = role === "admin" || role === "owner";
  }
  if (typeof is_active === "boolean") data.isActive = is_active;
  if (typeof notify_new_drops === "boolean") data.notifyNewDrops = notify_new_drops;
  if (typeof notify_promos === "boolean") data.notifyPromos = notify_promos;

  try {
    const user = await prisma.user.update({
      where: { telegramId: BigInt(telegram_id) },
      data,
    });
    return NextResponse.json({
      id: String(user.id),
      telegram_id: Number(user.telegramId),
      role: user.role,
      is_active: user.isActive,
    });
  } catch {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
}
