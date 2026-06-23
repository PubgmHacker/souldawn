import { NextRequest, NextResponse } from "next/server";
import type { OrderItem, Contact } from "@/lib/types";
import { verifyToken, ACCESS_TOKEN_COOKIE } from "@/lib/auth";
import { createPendingOrder, markOrderCancelled } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { applyPromoFromDb, reservePromoUsage, releasePromoUsage } from "@/lib/pricing";
import { calcDelivery } from "@/lib/cdek";

const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID || "";
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY || "";
const YOOKASSA_RETURN_URL =
  process.env.YOOKASSA_RETURN_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";

// Верхняя граница количества на позицию — защита от абсурдных заказов.
const MAX_QTY_PER_ITEM = 20;
// Таймаут обращения к YooKassa.
const YOOKASSA_TIMEOUT_MS = 8000;

interface IncomingItem {
  id: string;
  size?: string;
  qty?: number;
  quantity?: number;
}

/**
 * POST /api/create-payment
 * Порядок: считаем сумму -> создаём платёж YooKassa -> СОХРАНЯЕМ заказ в БД.
 * Заказ сохраняется ДО возврата клиенту; при неудаче сохранения платёж
 * отменяется, чтобы не было «деньги списаны, заказа нет».
 *
 * БЕЗОПАСНОСТЬ: сумма и цены НЕ берутся из тела запроса. Для каждого item.id
 * загружается активный товар из БД, берётся priceKopecks, проверяется остаток,
 * сумма считается на сервере. Промокод применяется и резервируется серверно.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, contact, promo_code, delivery } = body as {
      items: IncomingItem[];
      contact: Contact & {
        city?: string;
        region?: string;
        postal_code?: string;
        city_code?: number;
      };
      payment_method?: string;
      promo_code?: string;
      delivery?: string; // 'cdek' | 'courier'
    };

    if (!items || !Array.isArray(items) || !items.length) {
      return NextResponse.json({ error: "Нет товаров в заказе" }, { status: 400 });
    }
    if (!contact?.phone) {
      return NextResponse.json({ error: "Укажи телефон" }, { status: 400 });
    }
    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      return NextResponse.json(
        { error: "Оплата не настроена. Свяжитесь с поддержкой." },
        { status: 503 }
      );
    }

    // ── Агрегация дубликатов (id+size) и строгая валидация qty ──────────
    // Без агрегации один id дважды позволил бы обойти проверку остатка.
    const aggregated = new Map<string, { id: string; size: string; qty: number }>();
    for (const it of items) {
      const id = String(it?.id ?? "");
      if (!id) {
        return NextResponse.json({ error: "Некорректный товар в заказе" }, { status: 400 });
      }
      const rawQty = Number(it.qty ?? it.quantity ?? 1);
      if (!Number.isFinite(rawQty)) {
        return NextResponse.json({ error: "Некорректное количество" }, { status: 400 });
      }
      const qty = Math.floor(rawQty);
      if (qty <= 0) {
        return NextResponse.json({ error: "Количество должно быть положительным" }, { status: 400 });
      }
      const size = it.size || "";
      const key = `${id}::${size}`;
      const prev = aggregated.get(key);
      aggregated.set(key, { id, size, qty: (prev?.qty ?? 0) + qty });
    }

    // ── Серверный пересчёт: цены и остатки из БД ──────────────────────────
    const productIds = [...new Set([...aggregated.values()].map((it) => it.id))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Суммарное кол-во по товару (по всем размерам) для проверки остатка.
    const qtyByProduct = new Map<string, number>();
    for (const it of aggregated.values()) {
      qtyByProduct.set(it.id, (qtyByProduct.get(it.id) ?? 0) + it.qty);
    }

    let subtotalKopecks = 0;
    const serverItems: {
      id: string;
      name: string;
      size: string;
      qty: number;
      price: number; // копейки за единицу (из БД)
    }[] = [];

    for (const it of aggregated.values()) {
      const product = productMap.get(it.id);
      if (!product) {
        return NextResponse.json(
          { error: `Товар недоступен или снят с продажи` },
          { status: 400 }
        );
      }
      if (it.qty > MAX_QTY_PER_ITEM) {
        return NextResponse.json(
          { error: `Максимум ${MAX_QTY_PER_ITEM} шт. одного товара` },
          { status: 400 }
        );
      }
      const totalForProduct = qtyByProduct.get(it.id) ?? 0;
      if (product.stock <= 0 || totalForProduct > product.stock) {
        return NextResponse.json(
          { error: `Товара "${product.name}" недостаточно на складе` },
          { status: 400 }
        );
      }
      subtotalKopecks += product.priceKopecks * it.qty;
      serverItems.push({
        id: product.id,
        name: product.name,
        size: it.size,
        qty: it.qty,
        price: product.priceKopecks,
      });
    }

    if (subtotalKopecks <= 0) {
      return NextResponse.json({ error: "Некорректная сумма заказа" }, { status: 400 });
    }

    // ── Серверное применение промокода (ПО БД) ───────────────────────────
    let totalKopecks = subtotalKopecks;
    let appliedPromo: string | null = null;
    if (promo_code) {
      const promo = await applyPromoFromDb(promo_code, subtotalKopecks);
      if (promo.valid && promo.total_after_discount !== undefined) {
        // Атомарно резервируем использование (проверка лимита + инкремент).
        const reserved = await reservePromoUsage(promo.code ?? promo_code);
        if (reserved) {
          totalKopecks = promo.total_after_discount;
          appliedPromo = promo.code ?? null;
        }
        // Если резерв не удался (лимит исчерпан конкурентно) — считаем без скидки.
      }
    }

    // ── Серверный расчёт доставки (не доверяем клиенту) ─────────────────
    const deliveryMethod = delivery === "courier" ? "courier" : "cdek";
    const totalQty = serverItems.reduce((s, it) => s + it.qty, 0);
    const quote = await calcDelivery({
      cityCode: contact?.city_code ? Number(contact.city_code) : undefined,
      postalCode: contact?.postal_code ? String(contact.postal_code) : undefined,
      region: contact?.region || contact?.city || undefined,
      totalQty,
    });
    const deliveryKopecks = quote.cost_kopecks;
    totalKopecks += deliveryKopecks;

    const desc =
      serverItems.length === 1
        ? `${serverItems[0].name} (${serverItems[0].size})`
        : `SOULDAWN — ${serverItems.length} товаров`;

    const auth = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");
    const idempotencyKey = `site-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let yooRes: Response;
    try {
      yooRes = await fetch("https://api.yookassa.ru/v3/payments", {
        method: "POST",
        signal: AbortSignal.timeout(YOOKASSA_TIMEOUT_MS),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
          "Idempotence-Key": idempotencyKey,
        },
        body: JSON.stringify({
          amount: { value: (totalKopecks / 100).toFixed(2), currency: "RUB" },
          capture: true,
          description: desc,
          confirmation: { type: "redirect", return_url: YOOKASSA_RETURN_URL },
          metadata: {
            items: JSON.stringify(serverItems),
            contact: JSON.stringify(contact),
            promo: appliedPromo,
            delivery: deliveryMethod,
            delivery_cost: String(deliveryKopecks),
            source: "website",
          },
        }),
      });
    } catch (e) {
      // Таймаут/сеть: платёж не создан — откатываем резерв промокода.
      if (appliedPromo) await releasePromoUsage(appliedPromo);
      console.error("create-payment: YooKassa unreachable", e);
      return NextResponse.json(
        { error: "Платёжная система недоступна. Попробуйте позже." },
        { status: 504 }
      );
    }

    const yooData = await yooRes.json();

    if (!yooRes.ok) {
      if (appliedPromo) await releasePromoUsage(appliedPromo);
      console.error("YooKassa error:", yooData);
      return NextResponse.json(
        { error: yooData.description || "Ошибка платёжной системы" },
        { status: 400 }
      );
    }

    if (yooData.status !== "pending" || !yooData.confirmation?.confirmation_url) {
      if (appliedPromo) await releasePromoUsage(appliedPromo);
      return NextResponse.json({ error: "Не удалось создать платёж" }, { status: 500 });
    }

    // Привязка к пользователю по куке (если авторизован).
    const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || "";
    const payload = token ? verifyToken(token) : null;
    const userId = payload?.userId ?? null;

    // Сохраняем заказ в БД ДО возврата клиенту. При неудаче отменяем платёж,
    // чтобы исключить «деньги списаны — заказа нет».
    try {
      await createPendingOrder({
        userId,
        items: serverItems,
        totalKopecks,
        yookassaId: yooData.id,
        contact,
        promoCode: appliedPromo,
      });
    } catch (e) {
      console.error("create-payment: failed to persist order, cancelling payment", e);
      try {
        await fetch(`https://api.yookassa.ru/v3/payments/${yooData.id}/cancel`, {
          method: "POST",
          signal: AbortSignal.timeout(YOOKASSA_TIMEOUT_MS),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
            "Idempotence-Key": `cancel-${idempotencyKey}`,
          },
          body: "{}",
        });
      } catch (cancelErr) {
        console.error("create-payment: failed to cancel payment after persist error", cancelErr);
      }
      if (appliedPromo) await releasePromoUsage(appliedPromo);
      return NextResponse.json(
        { error: "Не удалось оформить заказ. Платёж отменён, попробуйте ещё раз." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      confirmation_url: yooData.confirmation.confirmation_url,
      payment_id: yooData.id,
      total: totalKopecks,
    });
  } catch (error) {
    console.error("Payment API error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
