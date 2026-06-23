import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { telegramId, category, message } = await req.json();

    if (!telegramId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Ищем пользователя в БД
    const user = await prisma.user.findUnique({
      where: { telegram_id: BigInt(telegramId) },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Создаем тикет в базе данных
    const ticket = await prisma.support_tickets.create({
      data: {
        user_id: user.id,
        category: category || "general",
        message: message,
        status: "open",
        created_at: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      ticketId: ticket.id.toString() 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
