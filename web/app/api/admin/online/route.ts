import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const threshold = new Date(Date.now() - 2 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: { lastSeen: { gt: threshold } },
    orderBy: { lastSeen: "desc" },
    take: 100,
  });
  return NextResponse.json(
    users.map((u) => ({
      telegram_id: u.telegramId ? Number(u.telegramId) : null,
      username: u.username || "",
      name: u.fullName || "",
      last_seen: u.lastSeen ? new Date(u.lastSeen).toISOString() : null,
    }))
  );
}
