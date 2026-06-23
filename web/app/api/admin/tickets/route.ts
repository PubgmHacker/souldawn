import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/tickets
 * Список открытых / в работе тикетов.
 */
export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const tickets = await prisma.supportTicket.findMany({
    where: { status: { in: ["open", "in_progress"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(
    tickets.map((t) => ({
      id: String(t.id),
      user_id: Number(t.userId),
      original_text: t.originalText,
      status: t.status,
      accepted_by: t.acceptedBy ? Number(t.acceptedBy) : null,
      admin_name: t.adminName,
      created_at: t.createdAt ? new Date(t.createdAt).toISOString() : null,
    }))
  );
}
