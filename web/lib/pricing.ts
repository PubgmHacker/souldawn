/**
 * SOULDAWN — промокоды (серверная валидация). Совпадает с PROMO_CODES бота.
 * Процент скидки по коду.
 */
export const PROMO_CODES: Record<string, number> = {
  SOULDAWN10: 10,
  WELCOME15: 15,
  DROP20: 20,
};

export interface PromoResult {
  valid: boolean;
  code?: string;
  discount_percent?: number;
  discount_kopecks?: number;
  total_after_discount?: number;
  error?: string;
}

/** total — в копейках. Синхронный fallback по хардкоду (обратная совместимость). */
export function applyPromo(rawCode: string, total: number): PromoResult {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { valid: false, error: "Введите промокод" };
  const pct = PROMO_CODES[code];
  if (pct === undefined) return { valid: false, error: "Промокод не найден" };
  const discount = Math.floor((total * pct) / 100);
  return {
    valid: true,
    code,
    discount_percent: pct,
    discount_kopecks: discount,
    total_after_discount: total - discount,
  };
}

/**
 * Серверная валидация промокода ПО БД (активность, срок, лимит использований).
 * total — в копейках. Если кода нет в БД — fallback на хардкод applyPromo.
 */
import { prisma } from "@/lib/prisma";

export async function applyPromoFromDb(rawCode: string, total: number): Promise<PromoResult> {
  const code = (rawCode || "").trim().toUpperCase();
  if (!code) return { valid: false, error: "Введите промокод" };

  let promo: {
    discountPercent: number;
    isActive: boolean;
    usageLimit: number;
    usedCount: number;
    expiresAt: Date | null;
  } | null = null;
  try {
    promo = await prisma.promoCode.findUnique({ where: { code } });
  } catch {
    // Таблицы может не быть (миграция не применена) — fallback на хардкод.
    return applyPromo(code, total);
  }

  if (!promo) {
    // Нет в БД — пробуем хардкод (старые коды).
    return applyPromo(code, total);
  }
  if (!promo.isActive) return { valid: false, error: "Промокод неактивен" };
  if (promo.expiresAt && promo.expiresAt.getTime() < Date.now()) {
    return { valid: false, error: "Срок действия промокода истёк" };
  }
  if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
    return { valid: false, error: "Лимит использований промокода исчерпан" };
  }

  const pct = promo.discountPercent;
  const discount = Math.floor((total * pct) / 100);
  return {
    valid: true,
    code,
    discount_percent: pct,
    discount_kopecks: discount,
    total_after_discount: total - discount,
  };
}
