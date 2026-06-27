import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/tickets/[id]/reply
 * Сохраняет ответ оператора (статус answered). Фактическую отправку
 * сообщения пользователю выполняет бот.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json();
  const { text } = body as { text?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Текст ответа обязателен" }, { status: 400 });
  }

  try {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status: "answered" },
    });
    // Ответ кладём в admin_messages для истории; бот разберёт и отправит.
    return NextResponse.json({ id: String(ticket.id), status: ticket.status, reply: text.trim() });
  } catch {
    return NextResponse.json({ error: "Тикет не найден" }, { status: 404 });
  }
}
