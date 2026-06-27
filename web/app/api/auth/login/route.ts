import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
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
 * POST /api/auth/login
 * Вход по email+паролю или по telegram_id (автосоздание).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, telegram_id, username, name } = body as {
      email?: string;
      password?: string;
      telegram_id?: number;
      username?: string;
      name?: string;
    };

    let user: any = null;

    // ── Telegram login ───────────────────────────────────────────────────
    if (telegram_id) {
      const tgId = BigInt(telegram_id);
      const pub = await linkOrCreateUser("telegram", String(tgId), {
        telegramId: tgId,
        username: username || undefined,
        fullName: name || undefined,
      });
      user = await prisma.user.findUnique({ where: { id: pub.id } });
      if (!user?.isActive) {
        return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
      }
    }

    // ── Email / password login (пароль хранится в email-identity) ───────────────
    else if (email && password) {
      const identity = await findEmailIdentity(email);
      if (!identity || !identity.passwordHash) {
        return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
      }
      if (!identity.user.isActive) {
        return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
      }
      const valid = await verifyPassword(password, identity.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
      }
      user = await prisma.user.update({
        where: { id: identity.userId },
        data: { lastLogin: new Date() },
      });
    } else {
      return NextResponse.json(
        { error: "Укажите email/пароль или telegram_id" },
        { status: 400 }
      );
    }

    const publicUser = {
      id: String(user.id),
      email: user.email || null,
      telegram_id: user.telegramId ? Number(user.telegramId) : null,
      username: user.username || "",
      name: user.fullName || "",
      role: user.role,
      is_admin: user.role === "admin" || user.role === "owner",
      notify_new_drops: user.notifyNewDrops,
      notify_promos: user.notifyPromos,
    };

    const tokenPayload = {
      userId: publicUser.id,
      email: publicUser.email || undefined,
      telegram_id: publicUser.telegram_id || undefined,
      role: user.role,
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const response = NextResponse.json({ user: publicUser, token: accessToken });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (err: any) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
