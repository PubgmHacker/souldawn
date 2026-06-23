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
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token отсутствует" }, { status: 401 });
    }

    const payload = verifyToken(refreshToken);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Недействительный refresh token" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Пользователь не найден или заблокирован" },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: String(user.id),
      email: user.email || undefined,
      telegram_id: user.telegramId ? Number(user.telegramId) : undefined,
      role: user.role,
    };
    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    const response = NextResponse.json({ token: newAccessToken });
    response.cookies.set(ACCESS_TOKEN_COOKIE, newAccessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, newRefreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (err: any) {
    console.error("[refresh]", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
