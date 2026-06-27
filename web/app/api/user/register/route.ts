import { NextRequest, NextResponse } from "next/server";
import { linkOrCreateUser } from "@/lib/user-service";

/**
 * POST /api/user/register
 * Легаси-эндпоинт регистрации по telegram_id (раньше проксировал на bot-server).
 * Теперь upsert локально через Prisma. Ожидает: { telegram_id, username?, name? }.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegram_id, username, name } = body as {
      telegram_id?: number;
      username?: string;
      name?: string;
    };

    if (!telegram_id) {
      return NextResponse.json({ error: "telegram_id обязателен" }, { status: 400 });
    }

    const tgId = BigInt(telegram_id);
    const user = await linkOrCreateUser("telegram", String(tgId), {
      telegramId: tgId,
      username: username || undefined,
      fullName: name || undefined,
    });

    return NextResponse.json(user);
  } catch (e) {
    console.error("[user/register]", e);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
