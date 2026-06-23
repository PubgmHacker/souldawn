import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  cookieOptions,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { linkOrCreateUser, findEmailIdentity } from "@/lib/user-service";

/**
 * POST /api/auth/register
 * Регистрация по email+пароль. Создаёт user + email-identity.
 * telegram_id не требуется (поле nullable).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username } = body as {
      email?: string;
      password?: string;
      username?: string;
    };

    if (!email || !password) {
      return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 8 символов" },
        { status: 400 }
      );
    }

    const existing = await findEmailIdentity(email);
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const name = username || email.split("@")[0];

    // Создаём юзера + email-identity (без telegram_id — он теперь nullable).
    const publicUser = await linkOrCreateUser("email", email.toLowerCase(), {
      email: email.toLowerCase(),
      username: name,
      fullName: name,
      passwordHash,
    });

    const tokenPayload = { userId: publicUser.id, email: publicUser.email || undefined, role: publicUser.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const response = NextResponse.json({ user: publicUser, token: accessToken }, { status: 201 });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (err: any) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
