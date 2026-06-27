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

// Fallback chain: TELEGRAM_BOT_TOKEN → BOT_TOKEN (same bot, same token).
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";

const ALLOWED_ORIGINS = (process.env.ALLOWED_MINIAPP_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") || "";
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes("*"));
  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * POST /api/auth/mini-app
 * Авторизация из Telegram Mini App. Ожидает: { initData: "..." }.
 * Верифицирует локально, upsert через Prisma, единый JWT/кука/роль.
 *
 * Поддерживает cross-origin запросы из миниаппа (GitHub Pages и т.д.)
 * при настройке ALLOWED_MINIAPP_ORIGINS в env.
 */
export async function POST(request: NextRequest) {
  try {
    const { initData } = await request.json();
    if (!initData) {
      return NextResponse.json(
        { success: false, error: "Missing initData" },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    if (!BOT_TOKEN) {
      console.error("[auth/mini-app] BOT_TOKEN is not configured");
      return NextResponse.json(
        { success: false, error: "Bot token not configured" },
        { status: 500, headers: corsHeaders(request) }
      );
    }

    const verification = verifyMiniAppInitData(initData, BOT_TOKEN);
    if (!verification.valid || !verification.user) {
      console.warn("[auth/mini-app] verification failed:", verification.error);
      return NextResponse.json(
        { success: false, error: verification.error || "Invalid Mini App data" },
        { status: 401, headers: corsHeaders(request) }
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

    // Для cross-origin миниаппа: возвращаем token в JSON-теле,
    // т.к. httpOnly cookie не принимается браузером с другого origin.
    // Кука также ставится для same-origin запросов.
    const response = NextResponse.json(
      { success: true, user, orders, token: accessToken },
      { headers: corsHeaders(request) }
    );
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (e) {
    console.error("[auth/mini-app]", e);
    return NextResponse.json(
      { success: false, error: "Authentication failed" },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
