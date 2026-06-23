import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { telegramId, category, message } = await req.json();

    if (!telegramId || !message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const tId = BigInt(telegramId);

    // 1. Ищем или автоматически создаем пользователя в БД
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegram_id: tId } as any,
          { telegramId: tId } as any
        ]
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegram_id: tId,
          telegramId: tId,
          username: "web_user",
          name: "Посетитель Сайта",
          created_at: new Date(),
          createdAt: new Date(),
        } as any,
      });
    }

    // 2. Ищем модель тикетов
    const ticketModel = (prisma as any).support_tickets || (prisma as any).supportTicket;
    if (!ticketModel) {
      return NextResponse.json({ error: "Support ticket model not found" }, { status: 500 });
    }

    // 3. Создаем тикет в БД
    const ticket = await ticketModel.create({
      data: {
        user_id: user.id,
        userId: user.id,
        category: category || "general",
        message: message,
        status: "open",
        created_at: new Date(),
        createdAt: new Date(),
      } as any,
    });

    // 4. Записываем первое сообщение в таблицу логов сообщений чата (action_logs)
    const logModel = (prisma as any).action_logs || (prisma as any).actionLog;
    if (logModel) {
      await logModel.create({
        data: {
          ticket_id: ticket.id,
          ticketId: ticket.id,
          sender: "user",
          message: message,
          created_at: new Date(),
          createdAt: new Date(),
        } as any,
      });
    }

    // 5. КРИТИЧЕСКИЙ ШАГ: Отправляем уведомление операторам в Telegram через токен Саппорт-Бота
    const botToken = process.env.BOT_TOKEN;
    const rawSupportIds = process.env.SUPPORT_CHAT_ID || "520904288,1195137911,8340654471,8735560311";
    const supportChatIds = rawSupportIds.split(",").map(id => id.strip ? id.strip() : id);

    if (botToken) {
      const text = `❓ <b>Новое обращение с САЙТА!</b>\n\n<b>Категория:</b> ${category}\n<b>Текст:</b> ${message}\n\n🤖 <i>ИИ-Агент уже анализирует запрос...</i>`;
      
      // Рассылаем всем админам в ТГ
      for (const adminId of supportChatIds) {
        try {
          await fetch(`https://telegram.org{botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: adminId,
              text: text,
              parse_mode: "HTML"
            })
          });
        } catch (e) {
          console.error("Failed to notify admin via Telegram API:", e);
        }
      }
    }

    return NextResponse.json({ success: true, ticketId: ticket.id.toString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
