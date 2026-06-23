-- SOULDAWN — промокоды (управляются через админку).
-- Idempotent: безопасно на чистой и на существующей БД.

CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    discount_percent INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    usage_limit INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Сид текущих кодов. ON CONFLICT — не трогать редактированные.
INSERT INTO promo_codes (code, discount_percent) VALUES
  ('SOULDAWN10', 10),
  ('WELCOME15', 15),
  ('DROP20', 20)
ON CONFLICT (code) DO NOTHING;
