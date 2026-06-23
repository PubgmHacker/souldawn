import { NextRequest, NextResponse } from "next/server";
import { verifyMiniAppInitData } from "@/lib/telegram-auth";
import { linkOrCreateUser, getOrdersForUser } from "@/lib/user-service";
import {
  signAccessToken,
  signRefreshToken,
  cookieOptions,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

/**
 * POST /api/auth/mini-app
 * Авторизация из Telegram Mini App. Ожидает: { initData: "..." }.
 * Верифицирует локально, upsert через Prisma, единый JWT/кука/роль.
 */
export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();
    if (!initData) {
      return NextResponse.json({ success: false, error: "Missing initData" }, { status: 400 });
    }

    const verification = verifyMiniAppInitData(initData, BOT_TOKEN);
    if (!verification.valid || !verification.user) {
      return NextResponse.json(
        { success: false, error: verification.error || "Invalid Mini App data" },
        { status: 401 }
      );
    }

    const tg = verification.user;
    const user = await linkOrCreateUser("telegram", String(tg.id), {
      telegramId: BigInt(tg.id),
      fullName: [tg.first_name, tg.last_name].filter(Boolean).join(" ").trim(),
      username: tg.username,
      photoUrl: tg.photo_url,
    });
    const orders = await getOrdersForUser(user.id);

    const tokenPayload = {
      userId: user.id,
      telegram_id: user.telegram_id,
      role: user.role,
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const response = NextResponse.json({ success: true, user, orders, token: accessToken });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (e) {
    console.error("[auth/mini-app]", e);
    return NextResponse.json({ success: false, error: "Authentication failed" }, { status: 500 });
  }
}
