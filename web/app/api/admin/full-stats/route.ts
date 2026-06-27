import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { computeFullStats } from "@/lib/stats";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const stats = await computeFullStats();
  return NextResponse.json(stats);
}
