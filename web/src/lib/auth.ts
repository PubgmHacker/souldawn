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

/** Parse ADMIN_IDS env var (comma-separated TG IDs) into a Set of numbers. */
export function parseAdminIds(): Set<number> {
  const raw = process.env.ADMIN_IDS || "";
  if (!raw.trim()) return new Set();
  return new Set(
    raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
  );
}

/** True if the given Telegram ID is listed in ADMIN_IDS. */
export function isConfiguredAdmin(telegramId: number | undefined | null): boolean {
  if (telegramId == null) return false;
  return parseAdminIds().has(telegramId);
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
      const tgId = payload.telegram_id ?? (dbUser.telegramId != null ? Number(dbUser.telegramId) : undefined);
      const role = dbUser.role || "user";
      const dbIsAdmin = role === "admin" || role === "owner" || !!dbUser.isAdmin;
      // ADMIN_IDS env var is the source of truth — promote on the fly if listed there.
      const envIsAdmin = isConfiguredAdmin(tgId);
      const isAdmin = dbIsAdmin || envIsAdmin;
      // Persist the promotion so future checks + listings reflect it.
      if (envIsAdmin && role !== "owner" && role !== "admin") {
        await db.user.update({
          where: { id: payload.userId },
          data: { role: "owner", isAdmin: true },
        }).catch(() => {});
      }
      return {
        userId: payload.userId,
        telegramId: tgId,
        role: isAdmin ? "owner" : role,
        isAdmin,
      };
    }
  } catch {
    // DB unavailable — fall back to JWT claims
  }

  // Fall back to JWT claims, but still honor ADMIN_IDS env var
  const envIsAdmin = isConfiguredAdmin(payload.telegram_id);
  return {
    userId: payload.userId,
    telegramId: payload.telegram_id,
    role: isAdminRole(payload.role) || envIsAdmin ? "owner" : payload.role || "user",
    isAdmin: isAdminRole(payload.role) || envIsAdmin,
  };
}
