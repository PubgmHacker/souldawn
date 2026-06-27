import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const ALLOWED = ["pending", "processing", "paid", "shipped", "delivered", "cancelled"];

/**
 * PATCH /api/admin/orders/[id]
 * Меняет статус заказа.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status?: string };
  if (!status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  try {
    const order = await prisma.order.update({ where: { id }, data: { status } });
    return NextResponse.json({ id: String(order.id), status: order.status });
  } catch {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }
}
