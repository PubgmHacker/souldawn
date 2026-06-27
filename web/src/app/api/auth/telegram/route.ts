import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { signAccessToken, signRefreshToken, cookieOptions, ACCESS_MAX_AGE, REFRESH_MAX_AGE, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth";
import { linkOrCreateUser } from "@/lib/user-service";
import { db } from "@/lib/db";

/** Parse ADMIN_IDS env var (comma-separated TG IDs) into a Set of numbers. */
function parseAdminIds(): Set<number> {
  const raw = process.env.ADMIN_IDS || "";
  if (!raw.trim()) return new Set();
  return new Set(
    raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  );
}

/** If the user's telegram_id is in ADMIN_IDS, ensure their role is "owner". */
async function ensureAdminRole(userId: string, telegramId: number | null): Promise<void> {
  if (!telegramId) return;
  const adminIds = parseAdminIds();
  if (adminIds.size === 0) return;
  if (adminIds.has(telegramId)) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user && user.role !== "owner") {
      await db.user.update({
        where: { id: userId },
        data: { role: "owner", isAdmin: true },
      });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";

    // Verify hash if BOT_TOKEN is set
    if (BOT_TOKEN) {
      const { hash, ...params } = data;
      const checkString = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("\n");
      const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();
      const hmac = crypto.createHmac("sha256", secretKey).update(checkString).digest("hex");
      if (hmac !== hash) {
        return NextResponse.json({ error: "Подпись неверна" }, { status: 401 });
      }
    }

    // Use linkOrCreateUser to create both User + Identity
    const user = await linkOrCreateUser("telegram", String(data.id), {
      fullName: [data.first_name, data.last_name].filter(Boolean).join(" ").trim(),
      username: data.username || "",
      telegramId: data.id,
      photoUrl: data.photo_url || "",
    });

    // Promote to owner if TG ID is in ADMIN_IDS
    await ensureAdminRole(user.id, data.id);
    console.log("[telegram-auth] tg_id=%s, admin_ids=%s, after_ensure...", data.id, process.env.ADMIN_IDS || "(empty)");

    // Re-fetch user to get updated role
    const updatedUser = await db.user.findUnique({ where: { id: user.id } });
    const profile = updatedUser?.profileData ? JSON.parse(updatedUser.profileData) : {};

    const publicUser = {
      id: updatedUser!.id,
      telegram_id: updatedUser!.telegramId ?? null,
      username: updatedUser!.username || "",
      name: updatedUser!.fullName || "",
      photo_url: profile.photo_url || null,
      email: updatedUser!.email || null,
      role: updatedUser!.role,
      is_admin: updatedUser!.role === "admin" || updatedUser!.role === "owner" || !!updatedUser!.isAdmin,
      notify_new_drops: !!updatedUser!.notifyNewDrops,
      notify_promos: !!updatedUser!.notifyPromos,
      email_verified: false,
      created_at: updatedUser!.createdAt ? new Date(updatedUser!.createdAt).toISOString() : null,
      last_login: updatedUser!.lastLogin ? new Date(updatedUser!.lastLogin).toISOString() : null,
    };

    // Store full TG session data as logs — skip for admin users
    if (!publicUser.is_admin) {
      await db.tgSession.create({
        data: {
          userId: user.id,
          rawData: JSON.stringify(data),
          authDate: data.auth_date || Math.floor(Date.now() / 1000),
          hash: data.hash || "",
        },
      });
    }

    const tokenPayload = {
      userId: user.id,
      telegram_id: updatedUser!.telegramId || undefined,
      role: updatedUser!.role,
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const response = NextResponse.json({ success: true, user: publicUser, token: accessToken });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (err) {
    console.error("[telegram-auth]", err);
    return NextResponse.json({ error: "Ошибка авторизации" }, { status: 500 });
  }
}