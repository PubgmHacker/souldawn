import { NextRequest, NextResponse } from "next/server";
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
 * POST /api/auth/vk — VK OAuth (authorization code flow).
 * Body: { code: string, redirect_uri: string }
 *
 * Exchanges the code for an access token + user_id, fetches the profile, then
 * links/creates the user and issues the unified JWT session.
 * Requires VK_CLIENT_ID + VK_CLIENT_SECRET (VK ID app).
 */
const VK_CLIENT_ID = process.env.VK_CLIENT_ID || "";
const VK_CLIENT_SECRET = process.env.VK_CLIENT_SECRET || "";
const VK_API_VERSION = "5.199";

export async function POST(request: NextRequest) {
  if (!VK_CLIENT_ID || !VK_CLIENT_SECRET) {
    return NextResponse.json(
      { success: false, error: "VK вход не настроен (VK_CLIENT_ID/VK_CLIENT_SECRET)" },
      { status: 501 }
    );
  }

  const { code, redirect_uri } = await request.json().catch(() => ({}));
  if (!code || !redirect_uri) {
    return NextResponse.json(
      { success: false, error: "Missing code/redirect_uri" },
      { status: 400 }
    );
  }

  try {
    // 1) Exchange code -> access_token (+ user_id, optional email).
    const tokenUrl = new URL("https://oauth.vk.com/access_token");
    tokenUrl.searchParams.set("client_id", VK_CLIENT_ID);
    tokenUrl.searchParams.set("client_secret", VK_CLIENT_SECRET);
    tokenUrl.searchParams.set("redirect_uri", redirect_uri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token || !tokenData.user_id) {
      return NextResponse.json(
        { success: false, error: tokenData.error_description || "VK token exchange failed" },
        { status: 401 }
      );
    }

    const vkUserId = String(tokenData.user_id);
    const email: string | undefined = tokenData.email;

    // 2) Fetch the profile (name + avatar).
    let fullName = "";
    let photoUrl: string | undefined;
    try {
      const apiUrl = new URL("https://api.vk.com/method/users.get");
      apiUrl.searchParams.set("user_ids", vkUserId);
      apiUrl.searchParams.set("fields", "photo_200");
      apiUrl.searchParams.set("access_token", tokenData.access_token);
      apiUrl.searchParams.set("v", VK_API_VERSION);
      const apiRes = await fetch(apiUrl.toString());
      const apiData = await apiRes.json();
      const p = apiData?.response?.[0];
      if (p) {
        fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        photoUrl = p.photo_200;
      }
    } catch {
      // profile is optional
    }

    // 3) Link/create + session.
    const user = await linkOrCreateUser("vk", vkUserId, { email, fullName, photoUrl });
    const orders = await getOrdersForUser(user.id);

    const tokenPayload = { userId: user.id, telegram_id: user.telegram_id, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const response = NextResponse.json({ success: true, user, orders, token: accessToken });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, cookieOptions(ACCESS_MAX_AGE));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
    return response;
  } catch (e) {
    console.error("[auth/vk]", e);
    return NextResponse.json({ success: false, error: "VK authentication failed" }, { status: 500 });
  }
}
