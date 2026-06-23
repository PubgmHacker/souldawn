import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth";
import { setEmailVerified } from "@/lib/user-service";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * GET /api/auth/email/verify?token=...
 * Проверяет токен, ставит email_verified=true, редиректит в личный кабинет.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") || "";
  const payload = token ? verifyEmailToken(token) : null;
  if (!payload) {
    return NextResponse.redirect(`${SITE_URL}/verify-email?status=invalid`);
  }

  // Если email успел занять другой аккаунт — отклоняем.
  const conflict = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
  if (conflict && conflict.id !== payload.userId) {
    return NextResponse.redirect(`${SITE_URL}/verify-email?status=conflict`);
  }

  try {
    await setEmailVerified(payload.userId, payload.email);
  } catch {
    return NextResponse.redirect(`${SITE_URL}/verify-email?status=error`);
  }

  return NextResponse.redirect(`${SITE_URL}/verify-email?status=ok`);
}
