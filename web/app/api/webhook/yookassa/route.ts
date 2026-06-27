import { NextRequest, NextResponse } from "next/server";
import { markOrderPaid, markOrderCancelled, findOrderByYookassaId } from "@/lib/orders";

/**
 * POST /api/webhook/yookassa — уведомление YooKassa об оплате.
 *
 * Ищет заказ по yookassaId в БД (не в памяти), выставляет paid/cancelled.
 * WEBHOOK_SECRET ОБЯЗАТЕЛЕН: без него запрос отклоняется (503), чтобы
 * исключить поддельные payment.succeeded.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET || "";
  if (!secret) {
    console.error(
      "[webhook/yookassa] WEBHOOK_SECRET не задан — webhook отклонён. " +
        "Установите WEBHOOK_SECRET в окружении."
    );
    return new NextResponse("Webhook not configured", { status: 503 });
  }
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader !== `Bearer ${secret}`) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let data: any;
  try {
    data = await request.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const event = data?.event;
  const obj = data?.object || {};
  const paymentId = obj?.id as string | undefined;

  if (!paymentId) {
    // Нет id — подтверждаем приём, чтобы YooKassa не ретраил.
    return NextResponse.json({ ok: true });
  }

  if (event === "payment.succeeded") {
    // Проверка суммы (копейки).
    const order = await findOrderByYookassaId(paymentId);
    if (order) {
      const paidValue = obj?.amount?.value;
      if (paidValue !== undefined) {
        const paidKopecks = Math.round(parseFloat(paidValue) * 100);
        if (paidKopecks !== order.total) {
          console.error(
            `YooKassa webhook: amount mismatch payment=${paymentId} paid=${paidKopecks} expected=${order.total}`
          );
          // Не подтверждаем оплату при расхождении суммы.
          return NextResponse.json({ ok: true, warning: "amount_mismatch" });
        }
      }
      await markOrderPaid(paymentId);
    } else {
      console.warn(`YooKassa webhook: order not found for payment ${paymentId}`);
    }
  } else if (event === "payment.canceled") {
    await markOrderCancelled(paymentId);
  }

  return NextResponse.json({ ok: true });
}
