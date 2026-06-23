-- SOULDAWN — Миграция 0007: таблицы notifications и reviews

-- ─── Notifications (пуш-центр) ───
CREATE TABLE IF NOT EXISTS "notifications" (
    "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
    "type"        TEXT        NOT NULL DEFAULT 'system',
    "audience"    TEXT        NOT NULL DEFAULT 'user',
    "telegram_id" BIGINT,
    "title"       TEXT        NOT NULL DEFAULT '',
    "body"        TEXT        NOT NULL DEFAULT '',
    "meta"        JSONB,
    "read"        BOOLEAN     NOT NULL DEFAULT false,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_telegram_id_read_idx"
    ON "notifications"("telegram_id", "read");

CREATE INDEX IF NOT EXISTS "notifications_audience_read_idx"
    ON "notifications"("audience", "read");

-- ─── Reviews (кэш отзывов из Telegram) ───
CREATE TABLE IF NOT EXISTS "reviews" (
    "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
    "tg_message_id" INTEGER    NOT NULL,
    "author"       TEXT        NOT NULL DEFAULT 'Покупатель',
    "username"     TEXT,
    "text"         TEXT        NOT NULL DEFAULT '',
    "rating"       INTEGER,
    "media_type"   TEXT        NOT NULL DEFAULT 'none',
    "media_url"    TEXT,
    "media_thumb"  TEXT,
    "tg_date"      INTEGER     NOT NULL,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "reviews_pkey"           PRIMARY KEY ("id"),
    CONSTRAINT "reviews_tg_message_id_key" UNIQUE ("tg_message_id")
);

CREATE INDEX IF NOT EXISTS "reviews_tg_date_idx"
    ON "reviews"("tg_date");
