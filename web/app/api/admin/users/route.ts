import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return NextResponse.json(
    users.map((u) => ({
      id: String(u.id),
      telegram_id: u.telegramId ? Number(u.telegramId) : null,
      username: u.username || "",
      name: u.fullName || "",
      email: u.email || null,
      role: u.role,
      is_admin: u.role === "admin" || u.role === "owner" || u.isAdmin,
      is_active: u.isActive,
      notify_new_drops: u.notifyNewDrops,
      notify_promos: u.notifyPromos,
      created_at: u.createdAt ? new Date(u.createdAt).toISOString() : null,
      last_seen: u.lastSeen ? new Date(u.lastSeen).toISOString() : null,
    }))
  );
}
