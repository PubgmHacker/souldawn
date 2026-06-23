import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

(BigInt.prototype as any).toJSON = function () { return this.toString(); };
const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { telegramId, category, message } = await req.json();
    if (!telegramId || !message) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const strId = String(telegramId);
    const numId = Number(telegramId);

    // Безопасный поиск по реальной схеме Prisma
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegram_id: numId } as any,
          { telegram_id: strId } as any,
          { telegramId: numId } as any,
          { telegramId: strId } as any
        ]
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(telegramId),
          fullName: "Посетитель Сайта",
          email: "web_" + Math.random().toString(36).substr(2, 5) + "@souldawn.net",
          isActive: true
        } as any,
      }).catch(async () => {
        return await prisma.user.create({
          data: {
            telegram_id: numId,
            name: "Посетитель Сайта",
            username: "web_user"
          } as any,
        });
      });
    }

    const ticketModel = (prisma as any).support_tickets || (prisma as any).supportTicket;
    const generatedId = "ticket_" + Math.random().toString(36).substr(2, 9);
    
    const ticket = await ticketModel.create({
      data: {
        id: generatedId,
        user_id: user.id,
        userId: user.id,
        category: category || "general",
        message: message,
        status: "open"
      } as any,
    });

    const logModel = (prisma as any).action_logs || (prisma as any).actionLog;
    if (logModel && ticket) {
      await logModel.create({
        data: { ticket_id: ticket.id, ticketId: ticket.id, sender: "user", message: message } as any,
      }).catch(() => {});
    }

    // ЧИТАЕМ СТРОГО ИЗОЛИРОВАННЫЙ ТОКЕН ПОДДЕРЖКИ
    const botToken = process.env.SUPPORT_BOT_TOKEN;
    const rawSupportIds = process.env.SUPPORT_CHAT_ID || "8340654471";
    const supportChatIds = rawSupportIds.split(",").map(id => id.trim());

    if (botToken && ticket) {
      const text = `❓ <b>Новое обращение с САЙТА!</b>\n\n<b>ID тикета:</b> <code>${ticket.id}</code>\n<b>Категория:</b> ${category}\n<b>Текст:</b> ${message}`;
      const replyMarkup = { inline_keyboard: [[{ text: "💬 Ответить пользователю", callback_data: `ticket:reply:${ticket.id}` }]] };
      for (const adminId of supportChatIds) {
        try {
          await fetch(`https://telegram.org{botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: adminId, text: text, parse_mode: "HTML", reply_markup: replyMarkup })
          });
        } catch (e) {}
      }
    }

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
