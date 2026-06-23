import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { telegramId, category, message } = await req.json();

    if (!telegramId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegram_id: BigInt(telegramId) } as any,
          { telegramId: BigInt(telegramId) } as any,
          { telegramId: String(telegramId) } as any
        ]
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Универсальный динамический выбор модели (supportTicket или support_tickets)
    const ticketModel = (prisma as any).support_tickets || (prisma as any).supportTicket;

    if (!ticketModel) {
      return NextResponse.json({ error: "Support ticket model not found in Prisma schema" }, { status: 500 });
    }

    const ticket = await ticketModel.create({
      data: {
        user_id: user.id,
        userId: user.id, // На случай если в PrismaCamelCase
        category: category || "general",
        message: message,
        status: "open",
        created_at: new Date(),
        createdAt: new Date(),
      } as any,
    });

    return NextResponse.json({ 
      success: true, 
      ticketId: ticket.id.toString() 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
