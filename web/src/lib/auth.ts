import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "souldawn_dev_secret_change_in_prod";
const JWT_EXPIRES_IN = "24h";
const REFRESH_EXPIRES_IN = "7d";

export interface JWTPayload {
  userId: string;
  email?: string;
  telegram_id?: number;
  role: string;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function signRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export const ACCESS_TOKEN_COOKIE = "sd_access_token";
export const REFRESH_TOKEN_COOKIE = "sd_refresh_token";

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export const ACCESS_MAX_AGE = 60 * 60 * 24;
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

export function isAdminRole(role: string): boolean {
  return role === "admin" || role === "owner";
}

import { NextRequest } from "next/server";

export interface AuthUser {
  userId: string;
  telegramId?: number;
  role: string;
  isAdmin: boolean;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const token = bearer || cookieToken;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  // Re-check admin role from DB to catch stale JWT roles
  try {
    const { db } = await import("@/lib/db");
    const dbUser = await db.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, isAdmin: true, telegramId: true },
    });
    if (dbUser) {
      const role = dbUser.role || "user";
      return {
        userId: payload.userId,
        telegramId: payload.telegram_id ?? dbUser.telegramId ?? undefined,
        role,
        isAdmin: role === "admin" || role === "owner" || !!dbUser.isAdmin,
      };
    }
  } catch {
    // DB unavailable — fall back to JWT claims
  }

  return {
    userId: payload.userId,
    telegramId: payload.telegram_id,
    role: payload.role || "user",
    isAdmin: isAdminRole(payload.role),
  };
}
