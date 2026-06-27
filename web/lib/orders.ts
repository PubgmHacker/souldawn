/**
 * SOULDAWN — заказы (Prisma). Единый источник истины для оплаты с сайта и из бота.
 * Суммы хранятся в копейках (Order.total).
 */
import { prisma } from "@/lib/prisma";

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
}) {
  const order = await prisma.order.create({
    data: {
      userId: params.userId ?? null,
      items: params.items as any,
      total: params.totalKopecks,
      status: "pending",
      yookassaId: params.yookassaId,
      contact: params.contact as any,
    },
  });
  return order;
}

export async function findOrderByYookassaId(yookassaId: string) {
  return prisma.order.findFirst({ where: { yookassaId } });
}

/** Помечает заказ оплаченным. Возвращает обновлённый заказ или null. */
export async function markOrderPaid(yookassaId: string) {
  const order = await findOrderByYookassaId(yookassaId);
  if (!order) return null;
  if (order.status === "paid" || order.status === "shipped" || order.status === "delivered") {
    return order; // уже подтверждён
  }
  return prisma.order.update({ where: { id: order.id }, data: { status: "paid" } });
}

export async function markOrderCancelled(yookassaId: string) {
  const order = await findOrderByYookassaId(yookassaId);
  if (!order) return null;
  if (order.status === "paid" || order.status === "shipped" || order.status === "delivered") {
    return order; // не отменяем уже оплаченный
  }
  return prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
}
