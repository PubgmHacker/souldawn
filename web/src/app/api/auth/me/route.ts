import { NextRequest, NextResponse } from "next/server";
import { verifyToken, ACCESS_TOKEN_COOKIE, getAuthUser } from "@/lib/auth";
import { getUserById, getOrdersForUser } from "@/lib/user-service";

export async function GET(request: NextRequest) {
  const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const token = bearer || cookieToken;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload?.userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // getAuthUser is the single source of truth for admin status:
  // it promotes the role on the fly if the TG id is in ADMIN_IDS.
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await getUserById(payload.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Override admin flags from the centralized check so the client always sees truth.
  if (authUser.isAdmin && !user.is_admin) {
    user.is_admin = true;
    user.role = authUser.role;
  }

  const orders = await getOrdersForUser(user.id);
  return NextResponse.json({ authenticated: true, user, orders });
}
