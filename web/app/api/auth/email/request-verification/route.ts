import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ACCESS_TOKEN_COOKIE, signEmailVerifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured, verificationEmailHtml } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/email/request-verification
 * Тело: { email }. Сохраняет email на текущего юзера (email_verified=false),
 * отправляет письмо со ссылкой подтверждения.
 */
export async function POST(request: NextRequest) {
  const token =
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value ||
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7)
      : "");
  const payload = token ? verifyToken(token) : null;
  if (!payload?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  }

  // Проверка: email не занят другим пользователем.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== payload.userId) {
    return NextResponse.json(
      { error: "Email уже привязан к другому аккаунту" },
      { status: 409 }
    );
  }

  // Сохраняем email на юзера, сбрасываем флаг подтверждения.
  try {
    await prisma.user.update({
      where: { id: payload.userId },
      data: { email, emailVerified: false },
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Email уже привязан к другому аккаунту" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Ошибка сохранения" }, { status: 500 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email-рассылка не настроена. Обратитесь к администратору." },
      { status: 503 }
    );
  }

  const verifyTokenStr = signEmailVerifyToken(payload.userId, email);
  const verifyUrl = `${SITE_URL}/verify-email?token=${encodeURIComponent(verifyTokenStr)}`;
  const sent = await sendEmail({
    to: email,
    subject: "Подтверди email — SOULDAWN",
    html: verificationEmailHtml(verifyUrl),
  });
  if (!sent.ok) {
    return NextResponse.json({ error: sent.error || "Не удалось отправить письмо" }, { status: 502 });
  }

  return NextResponse.json({ success: true, message: "Письмо отправлено на " + email });
}
