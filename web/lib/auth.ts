import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// JWT_SECRET обязателен в production: дефолтный секрет позволяет подделать токен
// (включая role=owner) и обойти всю админку. В dev допускаем явный fallback.
//
// ВАЖНО: проверка ́ленивая (при первом использовании), а не на этапе импорта,
// чтобы `next build` (NODE_ENV=production, но без рантайм-секретов) не падал в CI.
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

let cachedSecret: string | null = null;
function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProd && !isBuildPhase()) {
      throw new Error("JWT_SECRET is required in production. Set a strong random value.");
    }
    cachedSecret = "souldawn_jwt_secret_dev_only";
    return cachedSecret;
  }
  if (isProd && !isBuildPhase() && secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production.");
  }
  cachedSecret = secret;
  return cachedSecret;
}
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

// ─── Password helpers ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT helpers ─────────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function signRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, getSecret(), { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

// ─── Email verification token (отдельный purpose) ────────────────────────
export interface EmailVerifyPayload {
  userId: string;
  email: string;
  purpose: "verify_email";
}

export function signEmailVerifyToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, purpose: "verify_email" } satisfies EmailVerifyPayload,
    getSecret(),
    { expiresIn: "24h" }
  );
}

export function verifyEmailToken(token: string): EmailVerifyPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as EmailVerifyPayload;
    if (decoded.purpose !== "verify_email" || !decoded.userId || !decoded.email) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

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

export const ACCESS_MAX_AGE = 60 * 60 * 24;       // 24 hours
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;  // 7 days

// ─── Role helpers ─────────────────────────────────────────────────────────────

export type UserRole = "user" | "admin" | "owner";

export function isAdminRole(role: string): boolean {
  return role === "admin" || role === "owner";
}

export function isOwnerRole(role: string): boolean {
  return role === "owner";
}

// ─── Серверный хелпер: получить текущего пользователя из запроса ───
import { NextRequest } from "next/server";

export interface AuthUser {
  userId: string;
  telegramId?: bigint;
  role: string;
  isAdmin: boolean;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  const authHeader  = request.headers.get("authorization") || "";
  const bearer      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const token       = bearer || cookieToken;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  return {
    userId:     payload.userId,
    telegramId: payload.telegram_id ? BigInt(payload.telegram_id) : undefined,
    role:       payload.role || "user",
    isAdmin:    isAdminRole(payload.role),
  };
}
