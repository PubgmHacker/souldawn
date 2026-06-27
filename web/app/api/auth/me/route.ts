import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ACCESS_TOKEN_COOKIE } from "@/lib/auth";
import { getUserById, getOrdersForUser } from "@/lib/user-service";

/**
 * GET /api/auth/me
 * Читает единый JWT из куки sd_access_token (или Bearer),
 * возвращает актуального пользователя из БД (Prisma).
 */
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

  const user = await getUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const orders = await getOrdersForUser(user.id);
  return NextResponse.json({ authenticated: true, user, orders });
}
