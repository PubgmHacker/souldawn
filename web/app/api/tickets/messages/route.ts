import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const SUPPORT_CHAT_ID = process.env.SUPPORT_CHAT_ID || "8340654471";

const SYSTEM_PROMPT = `Ты — ИИ-ассистент поддержки бренда одежды SOULDAWN. Помогай клиентам отвечать на вопросы о заказах, качестве, наличии. Отвечай вежливо и лаконично.
⚠️ ВАЖНО: Если пользователь просит позвать человека, требует оператора, хочет оформить возврат или ты не можешь помочь — напиши строго одну фразу: '[OPERATOR]' и абсолютно ничего больше.`;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");
    if (!ticketId) return NextResponse.json({ error: "Ticket ID required" }, { status: 400 });

    const messages = await (prisma as any).action_logs.findMany({
      where: { ticket_id: ticketId },
      orderBy: { created_at: "asc" },
    });
    return NextResponse.json({ messages });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { ticketId, sender, text } = await req.json();
    if (!ticketId || !sender || !text) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const logModel = (prisma as any).action_logs;
    const ticketModel = (prisma as any).support_tickets || (prisma as any).supportTicket;

    // 1. Записываем сообщение пользователя
    const userMessage = await logModel.create({
      data: { ticket_id: ticketId, sender: sender, message: text, created_at: new Date() } as any
    });

    // 2. Если пишет пользователь, и тикет находится в ведении ИИ
    if (sender === "user") {
      const currentTicket = await ticketModel.findFirst({ where: { id: ticketId } });
      
      // Если менеджер еще не перехватил тикет (статус open)
      if (currentTicket && currentTicket.status === "open") {
        let aiAnswer = "";
        
        try {
          // Запрашиваем ответ у быстрой бесплатной модели Gemini Core
          const aiRes = await fetch("https://openrouter.ai", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash:free",
              messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: text }]
            })
          });
          const aiData = await aiRes.json();
          aiAnswer = aiData.choices[0].message.content.strip ? aiData.choices[0].message.content.strip() : aiData.choices[0].message.content.trim();
        } catch (e) {
          aiAnswer = "[OPERATOR]"; // При сбое сети ИИ сразу зовем человека
        }

        // Проверяем решение ИИ
        if (aiAnswer.includes("[OPERATOR]")) {
          // ПЕРЕКЛЮЧАЕМ РЕЖИМ НА МЕНЕДЖЕРА (меняем статус на operator)
          await ticketModel.update({
            where: { id: ticketId },
            data: { status: "operator" } as any
          });

          // Записываем системный лог переключения
          await logModel.create({
            data: { ticket_id: ticketId, sender: "system", message: "🔄 ИИ передал диалог менеджеру. Менеджер уведомлен.", created_at: new Date() } as any
          });

          // Отправляем сквозную карточку операторам в Telegram
          if (BOT_TOKEN) {
            const supportIds = SUPPORT_CHAT_ID.split(",");
            const textAlert = `👨‍💻 <b>Эскалация тикета МТС-стайл!</b>\n\n<b>ID тикета:</b> <code>${ticketId}</code>\n<b>Юзер позвал человека или ИИ не справился.</b>\n\n<b>Последний вопрос:</b> <i>${text}</i>`;
            const replyMarkup = { inline_keyboard: [[{ text: "💬 Ответить из Telegram", callback_data: `ticket:reply:${ticketId}` }]] };

            for (const adminId of supportIds) {
              await fetch(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: adminId, text: textAlert, parse_mode: "HTML", reply_markup: replyMarkup })
              }).catch(() => {});
            }
          }
        } else {
          // ИИ справился самостоятельно! Записываем его ответ в чат
          await logModel.create({
            data: { ticket_id: ticketId, sender: "ai", message: aiAnswer, created_at: new Date() } as any
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }); }
}
