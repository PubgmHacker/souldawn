-- SOULDAWN — Миграция 0008: поля трекинга доставки
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_number"  TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "tracking_carrier" TEXT;
