import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ACCESS_TOKEN_COOKIE } from "@/lib/auth";
import { getUserById, getOrdersForUser } from "@/lib/user-service";
import { db } from "@/lib/db";

/** Parse ADMIN_IDS env var (comma-separated TG IDs) into a Set of numbers. */
function parseAdminIds(): Set<number> {
  const raw = process.env.ADMIN_IDS || "";
  if (!raw.trim()) return new Set();
  return new Set(
    raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  );
}

/** Ensure user has admin role if their telegram_id is in ADMIN_IDS. */
async function ensureAdminRole(userId: string, telegramId: number | null): Promise<boolean> {
  if (!telegramId) return false;
  const adminIds = parseAdminIds();
  if (adminIds.size === 0) return false;
  if (!adminIds.has(telegramId)) return false;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  const shouldBeAdmin = user.role === "admin" || user.role === "owner";
  if (shouldBeAdmin && user.isAdmin) return true;

  await db.user.update({
    where: { id: userId },
    data: { role: "owner", isAdmin: true },
  });
  return true;
}

export async function GET(request: NextRequest) {
  const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const token = bearer || cookieToken;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Ensure admin role is up-to-date (fixes missed ADMIN_IDS on first login)
  if (payload.telegram_id) {
    await ensureAdminRole(payload.userId, payload.telegram_id);
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const orders = await getOrdersForUser(user.id);
  return NextResponse.json({ authenticated: true, user, orders });
}
