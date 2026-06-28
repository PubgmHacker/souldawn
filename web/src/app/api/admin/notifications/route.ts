import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/admin/notifications — list all notifications (with user info, optional filter)
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || undefined;
  const type = searchParams.get("type") || undefined;
  const unreadOnly = searchParams.get("unread") === "true";

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (type) where.type = type;
  if (unreadOnly) where.isRead = false;

  const notifs = await db.notification.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: {
        select: { id: true, fullName: true, username: true, email: true },
      },
    },
  });

  const notifications = notifs.map((n) => ({
    id: n.id,
    userId: n.userId,
    userName: n.user.fullName || n.user.username || "—",
    userEmail: n.user.email || "",
    title: n.title,
    body: n.body,
    type: n.type,
    isRead: n.isRead,
    createdBy: n.createdBy,
    createdAt: n.createdAt,
  }));

  // Stats
  const total = await db.notification.count();
  const unread = await db.notification.count({ where: { isRead: false } });
  const byType = await db.notification.groupBy({ by: ["type"], _count: true });

  return NextResponse.json({
    notifications,
    stats: {
      total,
      unread,
      byType: Object.fromEntries(byType.map((b) => [b.type, b._count])),
    },
  });
}

// POST /api/admin/notifications — create notification for specific user(s)
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const { userIds, title, body, type } = await request.json();
  if (!title || !body) return NextResponse.json({ error: "title и body обязательны" }, { status: 400 });
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: "userIds обязательны (массив)" }, { status: 400 });
  }

  const result = await db.notification.createMany({
    data: userIds.map((uid: string) => ({
      userId: uid,
      title,
      body,
      type: type || "info",
      createdBy: auth.userId,
    })),
  });

  return NextResponse.json({ success: true, sent: result.count });
}

// DELETE /api/admin/notifications — delete one or bulk
export async function DELETE(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth?.isAdmin) return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

  const body = await request.json();

  // Bulk delete by type
  if (body.deleteByType) {
    const { count } = await db.notification.deleteMany({ where: { type: body.deleteByType } });
    return NextResponse.json({ success: true, deleted: count });
  }

  // Bulk delete all read
  if (body.deleteRead) {
    const { count } = await db.notification.deleteMany({ where: { isRead: true } });
    return NextResponse.json({ success: true, deleted: count });
  }

  // Bulk delete all
  if (body.deleteAll) {
    const { count } = await db.notification.deleteMany({});
    return NextResponse.json({ success: true, deleted: count });
  }

  // Delete one by id
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id or action required" }, { status: 400 });

  await db.notification.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
