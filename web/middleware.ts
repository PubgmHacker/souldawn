import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ACCESS_TOKEN_COOKIE, isAdminRole } from "@/lib/auth";

// Маршруты, требующие авторизации
const PROTECTED_ROUTES = ["/dashboard", "/profile"];
// Маршруты, требующие роли admin/owner
const ADMIN_ROUTES = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAdmin = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (!isProtected && !isAdmin) return NextResponse.next();

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  // Страница /profile сама показывает форму входа для анонимов.
  if (!token) {
    if (pathname === "/profile") return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/profile";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const payload = verifyToken(token);
  if (!payload) {
    const url = request.nextUrl.clone();
    url.pathname = "/profile";
    url.searchParams.set("redirect", pathname);
    const response = NextResponse.redirect(url);
    response.cookies.set(ACCESS_TOKEN_COOKIE, "", { maxAge: 0, path: "/" });
    return response;
  }

  if (isAdmin && !isAdminRole(payload.role)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/profile", "/profile/:path*"],
};
