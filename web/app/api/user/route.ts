import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ACCESS_TOKEN_COOKIE } from "@/lib/auth";
import { getUserById, updateUserProfile } from "@/lib/user-service";

/**
 * GET /api/user
 * Возвращает текущего пользователя по JWT-куке (sd_access_token).
 */
export async function GET(request: NextRequest) {
  const token =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7)
      : "");
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getUserById(payload.userId);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

/**
 * PATCH /api/user
 * Self-service обновление своего профиля: имя, email, тоглы уведомлений.
 * Авторизация — только по куке; роль/админ-флаги изменить нельзя.
 */
export async function PATCH(request: NextRequest) {
  const token =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7)
      : "");
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: {
    fullName?: string;
    email?: string | null;
    notifyNewDrops?: boolean;
    notifyPromos?: boolean;
    notifyEmail?: boolean;
  } = {};
  if (typeof body.name === "string") patch.fullName = body.name;
  if (typeof body.fullName === "string") patch.fullName = body.fullName;
  if (body.email === null || typeof body.email === "string") patch.email = body.email;
  if (typeof body.notify_new_drops === "boolean") patch.notifyNewDrops = body.notify_new_drops;
  if (typeof body.notify_promos === "boolean") patch.notifyPromos = body.notify_promos;
  if (typeof body.notify_email === "boolean") patch.notifyEmail = body.notify_email;

  try {
    const user = await updateUserProfile(payload.userId, patch);
    return NextResponse.json({ user });
  } catch (e: any) {
    // Конфликт уникального email (Prisma P2002).
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Email уже используется" }, { status: 409 });
    }
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
  }
}
