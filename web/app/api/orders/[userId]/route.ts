import { NextRequest, NextResponse } from "next/server";

const BOT_SERVER_URL = process.env.NEXT_PUBLIC_BOT_SERVER_URL || "";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!BOT_SERVER_URL) {
    return NextResponse.json({ orders: [] });
  }
  try {
    const res = await fetch(`${BOT_SERVER_URL}/api/orders/${userId}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ orders: [] });
  }
}
