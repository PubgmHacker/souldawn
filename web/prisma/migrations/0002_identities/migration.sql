-- SOULDAWN — multi-provider auth: identities table + backfill.
-- Применяется поверх существующей БД через `prisma migrate deploy`.

-- 1. telegram_id больше не обязателен (остаётся UNIQUE).
ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL;

-- 2. Таблица identities.
CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_uid VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (provider, provider_uid)
);
CREATE INDEX IF NOT EXISTS identities_user_id_idx ON identities(user_id);

-- 3. Backfill: telegram-identity для каждого юзера с telegram_id.
INSERT INTO identities (user_id, provider, provider_uid)
SELECT id, 'telegram', telegram_id::text
FROM users
WHERE telegram_id IS NOT NULL
ON CONFLICT (provider, provider_uid) DO NOTHING;

-- 4. Backfill: email-identity для юзеров с email+password_hash.
INSERT INTO identities (user_id, provider, provider_uid, password_hash)
SELECT id, 'email', lower(email), password_hash
FROM users
WHERE email IS NOT NULL
ON CONFLICT (provider, provider_uid) DO NOTHING;
