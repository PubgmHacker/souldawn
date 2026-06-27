import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS + credentials for cross-origin requests from the Telegram Mini App.
 *
 * The Mini App (bot/miniapp) is served from a different origin than the Next.js
 * API (web/). Without `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials`,
 * the browser silently drops the response and auth fails — the user then sees
 * "Log in via Telegram" even though initData is available.
 *
 * We allow all origins (the request origin is reflected back) because the API is
 * read-mostly and protected by JWT/cookies; preflight OPTIONS is handled too.
 */
function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin && origin !== "null" ? origin : "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Cache-Control",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || "";

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  // Add CORS headers to actual API responses
  const response = NextResponse.next();
  if (origin) {
    const headers = corsHeaders(origin);
    Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
