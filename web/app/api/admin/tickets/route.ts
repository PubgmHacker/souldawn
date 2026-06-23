import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ticketModel = (prisma as any).support_tickets || (prisma as any).supportTicket;
    
    if (!ticketModel) {
      return NextResponse.json({ tickets: [] });
    }

    // Забираем абсолютно все тикеты из базы для админов, включая привязанных юзеров
    const tickets = await ticketModel.findMany({
      include: {
        user: true
      },
      orderBy: {
        created_at: "desc"
      } as any,
    });

    const formattedTickets = tickets.map((t: any) => ({
      id: t.id.toString(),
      category: t.category,
      message: t.message,
      status: t.status, // open, operator, resolved
      createdAt: t.created_at || t.createdAt,
      user: t.user ? {
        name: t.user.name,
        username: t.user.username,
        telegramId: (t.user.telegram_id || t.user.telegramId || "").toString()
      } : null
    }));

    return NextResponse.json({ tickets: formattedTickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
