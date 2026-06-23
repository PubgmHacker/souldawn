import { NextRequest, NextResponse } from "next/server";
import {
  markOrderPaid,
  markOrderCancelled,
  findOrderByYookassaId,
  ensureOrderFromMetadata,
} from "@/lib/orders";

/**
 * POST /api/webhook/yookassa — уведомление YooKassa об оплате.
 *
 * Ищет заказ по yookassaId в БД. Если заказа нет (сбой при создании) —
 * восстанавливает его из metadata платежа. Списание склада и статус paid —
 * идемпотентно (markOrderPaid). WEBHOOK_SECRET ОБЯЗАТЕЛЕН.
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
    // Сумма оплаты ОБЯЗАТЕЛЬНА для сверки: без неё не подтверждаем.
    const paidValue = obj?.amount?.value;
    if (paidValue === undefined || paidValue === null) {
      console.error(`YooKassa webhook: missing amount for payment ${paymentId}`);
      return NextResponse.json({ ok: true, warning: "missing_amount" });
    }
    const paidKopecks = Math.round(parseFloat(paidValue) * 100);
    if (!Number.isFinite(paidKopecks)) {
      console.error(`YooKassa webhook: invalid amount for payment ${paymentId}: ${paidValue}`);
      return NextResponse.json({ ok: true, warning: "invalid_amount" });
    }

    // Заказ мог не сохраниться при создании — восстанавливаем из metadata.
    let order = await findOrderByYookassaId(paymentId);
    if (!order) {
      const meta = obj?.metadata || {};
      try {
        const items = meta.items ? JSON.parse(meta.items) : [];
        const contact = meta.contact ? JSON.parse(meta.contact) : { phone: "" };
        if (Array.isArray(items) && items.length) {
          order = await ensureOrderFromMetadata({
            yookassaId: paymentId,
            totalKopecks: paidKopecks,
            items,
            contact,
            promoCode: meta.promo ?? null,
          });
        }
      } catch (e) {
        console.error(`YooKassa webhook: failed to rebuild order from metadata ${paymentId}`, e);
      }
    }

    if (!order) {
      console.warn(`YooKassa webhook: order not found for payment ${paymentId}`);
      return NextResponse.json({ ok: true, warning: "order_not_found" });
    }

    if (paidKopecks !== order.total) {
      console.error(
        `YooKassa webhook: amount mismatch payment=${paymentId} paid=${paidKopecks} expected=${order.total}`
      );
      // Не подтверждаем оплату при расхождении суммы.
      return NextResponse.json({ ok: true, warning: "amount_mismatch" });
    }

    await markOrderPaid(paymentId);
  } else if (event === "payment.canceled") {
    await markOrderCancelled(paymentId);
  }

  return NextResponse.json({ ok: true });
}
