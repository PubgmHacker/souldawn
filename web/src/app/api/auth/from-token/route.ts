import { NextRequest, NextResponse } from "next/server";
import {
  verifyToken,
  signAccessToken,
  signRefreshToken,
  cookieOptions,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";

/**
 * Cross-origin SSO bridge.
 *
 * The Telegram Mini App obtains a short-lived Bearer JWT (authToken) by posting
 * initData to /api/auth/mini-app. That token lives only in the mini app's JS
 * memory — it can never become an httpOnly cookie on the website origin because
 * the cross-origin fetch that issued it ran without `credentials: "include"`.
 *
 * When the mini app opens the website in a NEW browser tab (tg.openLink /
 * window.open), that tab has no cookies and no token, so /admin shows the login
 * form again. To bridge the session, the mini app appends `?token=<jwt>` to the
 * link; the website posts it here on first paint, we verify it and mint fresh
 * httpOnly access + refresh cookies. The token is then stripped from the URL.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    if (!token) {
      return NextResponse.json({ error: "No token" }, { status: 400 });
    }

    const payload = verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Недействительный токен" }, { status: 401 });
    }

    // Re-issue fresh cookies from the verified claims.
    const claims = {
      userId: payload.userId,
      email: payload.email,
      telegram_id: payload.telegram_id,
      role: payload.role,
    };
    const accessToken = signAccessToken(claims);
    const refreshToken = signRefreshToken(claims);

    const response = NextResponse.json({ success: true });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (err) {
    console.error("[from-token]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
