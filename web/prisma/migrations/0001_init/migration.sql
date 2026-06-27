-- SOULDAWN — initial schema.
-- Uses IF NOT EXISTS so it is safe on a DB the Python bot may already have
-- partially created. 0002_identities runs after this to add identities and
-- relax users.telegram_id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── users ───
CREATE TABLE IF NOT EXISTS users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id      BIGINT UNIQUE,
    username         VARCHAR(255) NOT NULL DEFAULT '',
    full_name        VARCHAR(255) NOT NULL DEFAULT '',
    email            VARCHAR(255) UNIQUE,
    password_hash    VARCHAR(255),
    role             VARCHAR(50)  NOT NULL DEFAULT 'user',
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    is_admin         BOOLEAN      NOT NULL DEFAULT FALSE,
    notify_new_drops BOOLEAN      NOT NULL DEFAULT TRUE,
    notify_promos    BOOLEAN      NOT NULL DEFAULT TRUE,
    last_seen        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_login       TIMESTAMP,
    site_sessions    INTEGER      NOT NULL DEFAULT 0,
    profile_data     JSONB,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── carts (user_id is PK + FK) ───
CREATE TABLE IF NOT EXISTS carts (
    user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    items      JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── orders ───
CREATE TABLE IF NOT EXISTS orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    items       JSONB NOT NULL,
    total       INTEGER NOT NULL,
    status      VARCHAR(50) NOT NULL DEFAULT 'pending',
    yookassa_id VARCHAR(255),
    contact     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── support_tickets (user_id is a telegram_id, not a FK) ───
CREATE TABLE IF NOT EXISTS support_tickets (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        BIGINT NOT NULL,
    admin_messages JSONB NOT NULL DEFAULT '[]',
    original_text  TEXT NOT NULL DEFAULT '',
    status         VARCHAR(50) NOT NULL DEFAULT 'open',
    accepted_by    BIGINT,
    admin_name     VARCHAR(255) NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── broadcasts ───
CREATE TABLE IF NOT EXISTS broadcasts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text       TEXT NOT NULL,
    target     VARCHAR(50) NOT NULL DEFAULT 'all',
    sent_at    TIMESTAMPTZ,
    sent_count INTEGER NOT NULL DEFAULT 0
);

-- ─── expenses ───
CREATE TABLE IF NOT EXISTS expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category    VARCHAR(50) NOT NULL DEFAULT 'other',
    description TEXT NOT NULL DEFAULT '',
    amount      INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
