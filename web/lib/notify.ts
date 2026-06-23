/**
 * SOULDAWN — Хелпер для создания уведомлений из серверных API-роутов.
 * Используется в /api/create-payment, /api/auth/*, /api/admin/* и т.д.
 */
import { prisma } from "@/lib/prisma";

export type NotifType = "welcome" | "promo" | "order" | "payment" | "support" | "system";

interface CreateNotifOpts {
  type: NotifType;
  audience: "user" | "admin" | "all";
  telegramId?: bigint | number | null;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}

export async function createNotification(opts: CreateNotifOpts): Promise<void> {
  try {
    const audiences = opts.audience === "all" ? ["user", "admin"] : [opts.audience];
    for (const audience of audiences) {
      await (prisma as any).notification.create({
        data: {
          type:       opts.type,
          audience,
          telegramId: opts.telegramId ? BigInt(opts.telegramId) : null,
          title:      opts.title,
          body:       opts.body,
          meta:       opts.meta || null,
        },
      });
    }
  } catch (e) {
    console.error("[notify] createNotification error:", e);
  }
}

/** Приветствие новому пользователю */
export async function notifyWelcome(telegramId: bigint | number, name: string) {
  await createNotification({
    type: "welcome",
    audience: "user",
    telegramId,
    title: "🌅  Добро пожаловать в SOULDAWN!",
    body: `${name}, ты в клубе тех, кто не сдаётся. Изучи коллекцию «Ангел vs Демон».`,
  });
}

/** Промокод пользователю */
export async function notifyPromo(telegramId: bigint | number, code: string, discount: number) {
  await createNotification({
    type: "promo",
    audience: "user",
    telegramId,
    title: `🎁  Промокод —${discount}%`,
    body: `Твой персональный промокод: <b>${code}</b>. Действует при оформлении заказа.`,
    meta: { code, discount },
  });
}

/** Изменение статуса заказа */
export async function notifyOrderStatus(
  telegramId: bigint | number,
  orderId: string,
  status: string,
) {
  const labels: Record<string, string> = {
    paid:      "Оплачен",
    shipped:   "Отправлен",
    delivered: "Доставлен",
    cancelled: "Отменён",
  };
  await createNotification({
    type: "order",
    audience: "user",
    telegramId,
    title: `📦  Заказ #${orderId.slice(0,8)} — ${labels[status] || status}`,
    body: `Статус вашего заказа обновлён.`,
    meta: { orderId, status },
  });
}

/** Оплата подтверждена (админам) */
export async function notifyPaymentAdmin(
  orderId: string,
  total: number,
  username: string,
  telegramId?: number,
) {
  await createNotification({
    type: "payment",
    audience: "admin",
    title: `💳  Оплата подтверждена`,
    body: `Заказ #${orderId.slice(0,8)} — ${(total/100).toLocaleString("ru-RU")} ₽. Пользователь: ${username || "—"} (ID: ${telegramId || "—"})`,
    meta: { orderId, total, username, telegramId },
  });
}

/** Новое обращение в поддержку (админам) */
export async function notifySupportAdmin(
  ticketId: string,
  username: string,
  telegramId: number,
  text: string,
) {
  await createNotification({
    type: "support",
    audience: "admin",
    title: `💬  Новое обращение`,
    body: `${username || "—"} (ID: ${telegramId}): ${text.slice(0, 120)}`,
    meta: { ticketId, username, telegramId },
  });
}
