import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { linkOrCreateUser, getOrdersForUser } from "@/lib/user-service";
import {
  signAccessToken,
  signRefreshToken,
  cookieOptions,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth";

/**
 * POST /api/auth/apple — Sign in with Apple.
 * Body: { id_token: string, user?: { name?: { firstName, lastName } } }
 *
 * Verifies the Apple identity token against Apple's JWKS, then links/creates the
 * user by the token `sub` and issues the unified JWT session (same as Telegram).
 * Requires APPLE_CLIENT_ID (your Apple Service ID / client id, used as `aud`).
 */
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || "";
const APPLE_ISS = "https://appleid.apple.com";

const JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export async function POST(request: NextRequest) {
  if (!APPLE_CLIENT_ID) {
    return NextResponse.json(
      { success: false, error: "Apple Sign-In не настроен (APPLE_CLIENT_ID)" },
      { status: 501 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const idToken: string | undefined = body.id_token;
  if (!idToken) {
    return NextResponse.json({ success: false, error: "Missing id_token" }, { status: 400 });
  }

  try {
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: APPLE_ISS,
      audience: APPLE_CLIENT_ID,
    });

    const sub = String(payload.sub || "");
    if (!sub) {
      return NextResponse.json({ success: false, error: "Invalid Apple token" }, { status: 401 });
    }
    const email = typeof payload.email === "string" ? payload.email : undefined;
    // Apple only sends the name on the very first authorization, in the body.
    const nm = body.user?.name;
    const fullName = nm
      ? [nm.firstName, nm.lastName].filter(Boolean).join(" ").trim()
      : undefined;

    const user = await linkOrCreateUser("apple", sub, { email, fullName });
    const orders = await getOrdersForUser(user.id);

    const tokenPayload = { userId: user.id, telegram_id: user.telegram_id, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const response = NextResponse.json({ success: true, user, orders, token: accessToken });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (e) {
    console.error("[auth/apple]", e);
    return NextResponse.json({ success: false, error: "Apple verification failed" }, { status: 401 });
  }
}
