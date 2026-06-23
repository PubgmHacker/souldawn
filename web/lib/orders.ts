/**
 * SOULDAWN — заказы (Prisma). Единый источник истины для оплаты с сайта и из бота.
 * Суммы хранятся в копейках (Order.total).
 */
import { prisma } from "@/lib/prisma";
import { decrementStock, restoreStock, type StockLine } from "@/lib/stock";
import { releasePromoUsage } from "@/lib/pricing";

export interface NewOrderItem {
  id: string;
  name: string;
  size: string;
  qty: number;
  price: number; // копейки за единицу
}

export interface NewOrderContact {
  phone: string;
  name?: string;
  email?: string;
}

/**
 * Создаёт заказ со статусом "pending" и привязывает yookassaId.
 * userId — uuid пользователя (если известен), иначе null (гостевой заказ).
 */
export async function createPendingOrder(params: {
  userId?: string | null;
  items: NewOrderItem[];
  totalKopecks: number;
  yookassaId: string;
  contact: NewOrderContact;
  promoCode?: string | null;
}) {
  // upsert по yookassaId (уникален): повторный вызов не создаёт дубль.
  const order = await prisma.order.upsert({
    where: { yookassaId: params.yookassaId },
    update: {},
    create: {
      userId: params.userId ?? null,
      items: params.items as any,
      total: params.totalKopecks,
      status: "pending",
      yookassaId: params.yookassaId,
      contact: params.contact as any,
      promoCode: params.promoCode ?? null,
    },
  });
  return order;
}

/** Извлекает позиции склада из JSON-поля items заказа. */
function orderStockLines(items: unknown): StockLine[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((it: any) => ({ id: String(it?.id ?? ""), qty: Math.floor(Number(it?.qty ?? 0)) }))
    .filter((l) => l.id && Number.isInteger(l.qty) && l.qty > 0);
}

export async function findOrderByYookassaId(yookassaId: string) {
  return prisma.order.findFirst({ where: { yookassaId } });
}

/**
 * Помечает заказ оплаченным ИДЕМПОТЕНТНО и списывает склад ровно один раз.
 * Переход pending->paid выполняется условным updateMany: при параллельных
 * webhook-ретраях только один вызов получит count>0 и спишет остатки.
 */
export async function markOrderPaid(yookassaId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { yookassaId } });
    if (!order) return null;
    if (order.status !== "pending" && order.status !== "processing") {
      return order; // уже обработан (paid/shipped/delivered/cancelled)
    }

    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: { in: ["pending", "processing"] }, stockApplied: false },
      data: { status: "paid", stockApplied: true },
    });
    if (claimed.count === 0) {
      return tx.order.findUnique({ where: { id: order.id } }); // кто-то опередил
    }

    await decrementStock(orderStockLines(order.items), tx);
    return tx.order.findUnique({ where: { id: order.id } });
  });
}

export async function markOrderCancelled(yookassaId: string) {
  const order = await findOrderByYookassaId(yookassaId);
  if (!order) return null;
  if (order.status === "paid" || order.status === "shipped" || order.status === "delivered") {
    return order; // не отменяем уже оплаченный
  }
  if (order.status === "cancelled") return order;
  // Отмена неоплаченного: склад не списывался, но резерв промо откатываем.
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: "cancelled" },
  });
  if ((order as any).promoCode) {
    await releasePromoUsage((order as any).promoCode);
  }
  return updated;
}

/**
 * Создаёт заказ из metadata платежа, если он не был сохранён ранее
 * (fallback при сбое в create-payment). Идемпотентен по yookassaId.
 */
export async function ensureOrderFromMetadata(params: {
  yookassaId: string;
  totalKopecks: number;
  items: NewOrderItem[];
  contact: NewOrderContact;
  promoCode?: string | null;
}) {
  return prisma.order.upsert({
    where: { yookassaId: params.yookassaId },
    update: {},
    create: {
      userId: null,
      items: params.items as any,
      total: params.totalKopecks,
      status: "pending",
      yookassaId: params.yookassaId,
      contact: params.contact as any,
      promoCode: params.promoCode ?? null,
    },
  });
}
