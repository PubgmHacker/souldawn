/**
 * GET /api/admin/events
 * Server-Sent Events — live уведомления админам.
 * Поллинг БД каждые 10с — отправляет дельту если что-то изменилось.
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = requireAdmin(request);
  if (admin instanceof NextResponse) return admin;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastOrderCount = 0;
      let lastTicketCount = 0;
      let closed = false;

      // Отправляем первоначальный пинг
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      const poll = async () => {
        if (closed) return;
        try {
          const [orderCount, ticketCount, pendingOrders, openTickets] = await Promise.all([
            prisma.order.count(),
            prisma.supportTicket.count({ where: { status: "open" } }),
            prisma.order.count({ where: { status: "pending" } }),
            prisma.supportTicket.findMany({
              where: { status: "open" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { id: true, createdAt: true, originalText: true },
            }),
          ]);

          const events: object[] = [];

          if (orderCount !== lastOrderCount) {
            events.push({ type: "new_order", total_orders: orderCount, pending: pendingOrders });
            lastOrderCount = orderCount;
          }
          if (ticketCount !== lastTicketCount) {
            const latest = openTickets[0];
            events.push({
              type: "new_ticket",
              open_tickets: ticketCount,
              latest_id: latest?.id,
              preview: latest?.originalText?.slice(0, 80),
            });
            lastTicketCount = ticketCount;
          }

          for (const ev of events) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
          }

          // heartbeat каждые 10с
          controller.enqueue(encoder.encode("data: {\"type\":\"ping\"}\n\n"));
        } catch {
          // БД недоступна — продолжаем
        }
      };

      // Инициализируем счётчики
      try {
        lastOrderCount  = await prisma.order.count();
        lastTicketCount = await prisma.supportTicket.count({ where: { status: "open" } });
      } catch {}

      const interval = setInterval(poll, 10_000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
