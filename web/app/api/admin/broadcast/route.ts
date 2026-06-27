import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/broadcast
 * Создаёт запись рассылки в БД. Фактическую отправку выполняет бот.
 */
export async function POST(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const body = await request.json();
  const { text, target } = body as { text?: string; target?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Текст обязателен" }, { status: 400 });
  }

  const broadcast = await prisma.broadcast.create({
    data: { text: text.trim(), target: target || "all" },
  });
  return NextResponse.json({
    id: String(broadcast.id),
    text: broadcast.text,
    target: broadcast.target,
    sent_count: broadcast.sentCount,
    queued: true,
  });
}
