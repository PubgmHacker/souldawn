import { NextRequest, NextResponse } from "next/server";
import { findOrderByYookassaId } from "@/lib/orders";

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || "";

/**
 * GET /api/check-payment/{paymentId}
 * Спрашивает статус напрямую у YooKassa; если ключи не заданы — отдаёт статус из БД.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  if (!paymentId) {
    return NextResponse.json({ error: "No payment_id" }, { status: 400 });
  }

  if (YOOKASSA_SHOP_ID && YOOKASSA_SECRET_KEY) {
    try {
      const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");
      const res = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({
          payment_id: paymentId,
          status: data.status || "unknown",
          amount: data.amount || {},
        });
      }
    } catch {
      // падаем на статус из БД ниже
    }
  }

  // Fallback: статус заказа из БД.
  const order = await findOrderByYookassaId(paymentId);
  if (order) {
    return NextResponse.json({
      payment_id: paymentId,
      status: order.status === "paid" ? "succeeded" : order.status,
      amount: { value: (order.total / 100).toFixed(2), currency: "RUB" },
    });
  }

  return NextResponse.json({ error: "Payment not found" }, { status: 404 });
}
