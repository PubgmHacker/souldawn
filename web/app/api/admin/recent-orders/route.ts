import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") || "20", 10) || 20,
    500
  );

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { username: true, fullName: true } } },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id:               String(o.id),
      user_id:          o.userId ? String(o.userId) : null,
      items:            o.items,
      total:            o.total,
      status:           o.status,
      contact:          o.contact,
      tracking_number:  (o as any).trackingNumber  ?? null,
      tracking_carrier: (o as any).trackingCarrier ?? null,
      username:         o.user?.username  ?? null,
      name:             o.user?.fullName  ?? null,
      created_at:       o.createdAt ? new Date(o.createdAt).toISOString() : null,
    }))
  );
}
