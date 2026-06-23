import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { telegramId, category, message } = await req.json();
    if (!telegramId || !message) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const tId = BigInt(telegramId);
    let user = await prisma.user.findFirst({
      where: { OR: [{ telegram_id: tId } as any, { telegramId: tId } as any] },
    });

    // Если пользователя нет (дебаг/имитация), создаем его на лету
    if (!user) {
      user = await prisma.user.create({
        data: { telegram_id: tId, telegramId: tId, username: "test_user", name: "Тестовый Аккаунт", created_at: new Date(), createdAt: new Date() } as any,
      });
    }

    const ticketModel = (prisma as any).support_tickets || (prisma as any).supportTicket;
    const ticket = await ticketModel.create({
      data: { user_id: user.id, userId: user.id, category: category || "general", message: message, status: "open", created_at: new Date(), createdAt: new Date() } as any,
    });

    const logModel = (prisma as any).action_logs || (prisma as any).actionLog;
    if (logModel) {
      await logModel.create({
        data: { ticket_id: ticket.id, ticketId: ticket.id, sender: "user", message: message, created_at: new Date(), createdAt: new Date() } as any,
      });
    }

    const botToken = process.env.BOT_TOKEN;
    const rawSupportIds = process.env.SUPPORT_CHAT_ID || "520904288,1195137911,8340654471,8735560311";
    const supportChatIds = rawSupportIds.split(",").map(id => id.trim());

    if (botToken) {
      const text = `❓ <b>Новое обращение с САЙТА!</b>\n\n<b>ID тикета:</b> <code>${ticket.id}</code>\n<b>Категория:</b> ${category}\n<b>Текст:</b> ${message}`;
      const replyMarkup = {
        inline_keyboard: [[{ text: "💬 Ответить пользователю", callback_data: `ticket:reply:${ticket.id}` }]]
      };

      for (const adminId of supportChatIds) {
        try {
          await fetch(`https://telegram.org{botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: adminId, text: text, parse_mode: "HTML", reply_markup: replyMarkup })
          });
        } catch (e) { console.error(e); }
      }
    }
    return NextResponse.json({ success: true, ticketId: ticket.id.toString() });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
