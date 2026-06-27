import { NextRequest, NextResponse } from "next/server";

const BOT_SERVER_URL = process.env.NEXT_PUBLIC_BOT_SERVER_URL || "";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!BOT_SERVER_URL) {
    return NextResponse.json({ items: [] });
  }
  try {
    const res = await fetch(`${BOT_SERVER_URL}/api/cart/${userId}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  if (!BOT_SERVER_URL) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }
  try {
    const body = await request.json();
    const res = await fetch(`${BOT_SERVER_URL}/api/cart/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Bot server unreachable" }, { status: 502 });
  }
}
