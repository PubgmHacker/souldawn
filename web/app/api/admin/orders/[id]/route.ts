import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUSES = ["pending", "processing", "paid", "shipped", "delivered", "cancelled"];

/**
 * PATCH /api/admin/orders/[id]
 * Меняет статус заказа и/или номер трекинга.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await request.json() as {
    status?: string;
    tracking_number?: string;
    tracking_carrier?: string;
  };

  const data: Record<string, string> = {};

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.tracking_number !== undefined) data.trackingNumber  = body.tracking_number;
  if (body.tracking_carrier !== undefined) data.trackingCarrier = body.tracking_carrier;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Нечего обновлять" }, { status: 400 });
  }

  try {
    const order = await prisma.order.update({ where: { id }, data });
    return NextResponse.json({
      id: String(order.id),
      status: order.status,
      tracking_number:  (order as any).trackingNumber  ?? null,
      tracking_carrier: (order as any).trackingCarrier ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }
}
