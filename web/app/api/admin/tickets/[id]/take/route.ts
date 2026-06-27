import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/tickets/[id]/take
 * Админ берёт тикет в работу (если ещё не взят).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { admin_id, admin_name } = body as { admin_id?: number; admin_name?: string };

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) {
    return NextResponse.json({ error: "Тикет не найден" }, { status: 404 });
  }
  if (ticket.acceptedBy) {
    return NextResponse.json({ error: "Тикет уже взят", admin_name: ticket.adminName }, { status: 409 });
  }

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      acceptedBy: admin_id ? BigInt(admin_id) : null,
      adminName: admin_name || "",
      status: "in_progress",
    },
  });
  return NextResponse.json({ id: String(updated.id), status: updated.status });
}
