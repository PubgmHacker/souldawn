/**
 * GET /api/admin/orders/export
 * Экспорт заказов в CSV.
 * Query params: status, from (ISO date), to (ISO date)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") || undefined;
  const from   = searchParams.get("from")   ? new Date(searchParams.get("from")!) : undefined;
  const to     = searchParams.get("to")     ? new Date(searchParams.get("to")!)   : undefined;

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const rows = [
    ["ID", "Статус", "Сумма (₽)", "Товаров", "Телефон", "Имя", "Дата"].join(","),
    ...orders.map((o) => {
      const contact = (o.contact as any) || {};
      const items   = Array.isArray(o.items)
        ? (o.items as any[]).map((it: any) => it.name || it.id || "?").join("; ")
        : "";
      return [
        o.id.slice(0, 8),
        o.status,
        ((o.total || 0) / 100).toFixed(2),
        `"${items}"`,
        contact.phone || "",
        contact.name  || "",
        o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 16) : "",
      ].join(",");
    }),
  ].join("\n");

  return new Response("\uFEFF" + rows, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
