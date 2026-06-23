import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json({ error: "Telegram ID required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(telegramId) },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Забираем все запросы этого пользователя
    const tickets = await prisma.support_tickets.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
    });

    // Безопасно конвертируем BigInt/Date в JSON-совместимый формат
    const formattedTickets = tickets.map((t) => ({
      id: t.id.toString(),
      category: t.category,
      message: t.message,
      status: t.status,
      createdAt: t.created_at,
    }));

    return NextResponse.json({ tickets: formattedTickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
