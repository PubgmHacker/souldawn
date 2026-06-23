-- SOULDAWN — Phase 5: contact_links table (редактируемые ссылки) + seed.
-- Idempotent: безопасно на чистой и на существующей БД.

CREATE TABLE IF NOT EXISTS contact_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    label VARCHAR(255) NOT NULL,
    url TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contact_links_active_sort_idx ON contact_links(is_active, sort_order);

-- Сид текущих ссылок футера. ON CONFLICT (key) DO NOTHING — не трогает редактированные.
INSERT INTO contact_links (key, label, url, sort_order) VALUES
  ('instagram', 'Instagram', 'https://instagram.com/souldawn', 0),
  ('telegram', 'Telegram', 'https://t.me/souldawn_support', 1),
  ('site', 'Сайт', 'https://souldawn.com', 2),
  ('catalog', 'Каталог', 'https://souldawn.com/collection', 3),
  ('support', 'Поддержка', 'https://t.me/souldawn_support_bot', 4),
  ('delivery', 'Доставка', 'https://souldawn.com', 5),
  ('returns', 'Возврат', 'https://souldawn.com', 6)
ON CONFLICT (key) DO NOTHING;
