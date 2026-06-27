/**
 * SOULDAWN — серверная проверка прав админа.
 * Заменяет клиентский заголовок X-Admin-Id (который подделывался).
 * Роль берётся из подписанного JWT.
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ACCESS_TOKEN_COOKIE, isAdminRole } from "@/lib/auth";

export interface AdminContext {
  userId: string;
  role: string;
}

/**
 * Возвращает контекст админа или NextResponse с ошибкой 401/403.
 * Использование:
 *   const admin = await requireAdmin(request);
 *   if (admin instanceof NextResponse) return admin;
 */
export function requireAdmin(request: NextRequest): AdminContext | NextResponse {
  const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const token = bearer || cookieToken;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = verifyToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(payload.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { userId: payload.userId, role: payload.role };
}
