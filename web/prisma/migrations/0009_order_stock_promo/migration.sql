-- 0009_order_stock_promo
-- Защита от дублей заказов по платежу и флаг идемпотентного списания склада.

-- Новые колонки.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promo_code" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "stock_applied" BOOLEAN NOT NULL DEFAULT false;

-- Страховка: если в данных уже есть дубли yookassa_id (кроме NULL),
-- уникальный индекс не создастся. В PostgreSQL несколько NULL не конфликтуют.
-- Партиальный уникальный индекс по non-null значениям.
CREATE UNIQUE INDEX IF NOT EXISTS "orders_yookassa_id_key"
  ON "orders" ("yookassa_id")
  WHERE "yookassa_id" IS NOT NULL;
