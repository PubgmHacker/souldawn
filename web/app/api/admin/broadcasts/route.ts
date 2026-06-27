import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "30", 10) || 30, 100);
  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { sentAt: "desc" },
    take: limit,
  });
  return NextResponse.json(
    broadcasts.map((b) => ({
      id: String(b.id),
      text: b.text,
      target: b.target,
      sent_at: b.sentAt ? new Date(b.sentAt).toISOString() : null,
      sent_count: b.sentCount,
    }))
  );
}
