import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) return NextResponse.json({ tickets: [] });

    const numId = Number(telegramId);
    const strId = String(telegramId);
    let bigId = null;
    try { bigId = BigInt(telegramId); } catch (_) {}

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegram_id: numId } as any,
          { telegram_id: strId } as any,
          { telegramId: numId } as any,
          { telegramId: strId } as any,
          ...(bigId ? [{ telegram_id: bigId } as any, { telegramId: bigId } as any] : [])
        ]
      },
    });

    if (!user) return NextResponse.json({ tickets: [] });

    const ticketModel = (prisma as any).support_tickets || (prisma as any).supportTicket;
    if (!ticketModel) return NextResponse.json({ tickets: [] });

    const tickets = await ticketModel.findMany({
      where: { OR: [{ user_id: user.id } as any, { userId: user.id } as any] },
      orderBy: { created_at: "desc" } as any,
    });

    const formattedTickets = tickets.map((t: any) => ({
      id: t.id.toString(),
      category: t.category,
      message: t.message,
      status: t.status,
      createdAt: t.created_at || t.createdAt,
    }));

    return NextResponse.json({ tickets: formattedTickets });
  } catch (error: any) {
    return NextResponse.json({ tickets: [], error: error.message }, { status: 200 });
  }
}
