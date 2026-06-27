-- SOULDAWN — Phase 1: products table (DB-backed catalog) + seed.
-- Idempotent: безопасно применяется на чистой и на существующей БД.

-- 1. Таблица products.
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    full_description TEXT NOT NULL DEFAULT '',
    price_kopecks INTEGER NOT NULL DEFAULT 0,
    old_price_kopecks INTEGER,
    category VARCHAR(100) NOT NULL DEFAULT '',
    images TEXT[] NOT NULL DEFAULT '{}',
    sizes TEXT[] NOT NULL DEFAULT '{}',
    details TEXT[] NOT NULL DEFAULT '{}',
    material VARCHAR(255) NOT NULL DEFAULT '',
    care VARCHAR(255) NOT NULL DEFAULT '',
    badge VARCHAR(20),
    stock INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_active_sort_idx ON products(is_active, sort_order);

-- 2. Сид текущего каталога (цены в копейках; теги -> badge).
-- ON CONFLICT (slug) DO NOTHING — не перезатирает редактированные админом товары.
INSERT INTO products (slug, name, description, full_description, price_kopecks, old_price_kopecks, category, images, sizes, details, material, care, badge, stock, sort_order)
VALUES
  ('king-of-the-ring-tee', 'Король ринга',
   'Оверсайз-футболка с принтом на спине, хлопок 220 г/м²',
   'Оверсайз-футболка из плотного хлопка 220 г/м² с крупным принтом на спине. Прямой крой, опущенная линия плеча.',
   299000, NULL, 'Верх',
   ARRAY['/products/5314688838582086472.jpg','/products/5314688838582086473.jpg'],
   ARRAY['S','M','L','XL'], ARRAY['Оверсайз-крой с опущенным плечом','Принт на спине','Плотность хлопка 220 г/м²'],
   '100% хлопок', 'Машинная стирка 30°', 'NEW', 10, 0),
  ('dawn-runner-tee', 'Dawn Runner Tee', 'Хлопковый оверсайз-tee с минималистичной вышивкой на спине',
   'Лёгкий оверсайз-tee из плотного хлопка 220 г/м².',
   499000, NULL, 'Верх', '{}', ARRAY['S','M','L','XL'], '{}', '100% хлопок', 'Машинная стирка 30°', 'NEW', 10, 1),
  ('concrete-shade-hoodie', 'Concrete Shade Hoodie', 'Плотный худи с kangaro-карманом и принтом «тень»',
   'Тяжёлое худи из хлопкового флиса с начёсом.',
   899000, NULL, 'Верх', '{}', ARRAY['S','M','L','XL'], '{}', '80% хлопок, 20% полиэстер', 'Машинная стирка 30°', 'HIT', 8, 2),
  ('shadow-track-pants', 'Shadow Track Pants', 'Сужающиеся трекшн-штаны с молниями на щиколотках',
   'Сужающиеся трекинг-штаны с застёжками-молниями на щиколотках.',
   599000, 799000, 'Низ', '{}', ARRAY['S','M','L','XL'], '{}', '65% хлопок, 35% полиэстер', 'Машинная стирка 30°', 'SALE', 5, 3),
  ('struggle-cap', 'Struggle Cap', 'Бейсболка с тиснёным логотипом SOULDAWN',
   'Классическая шести-панельная бейсболка.',
   349000, NULL, 'Аксессуары', '{}', ARRAY['S/M','L/XL'], '{}', '100% хлопок', 'Ручная стирка', 'NEW', 12, 4),
  ('steel-heart-tank', 'Steel Heart Tank', 'Рейта-топ из дышащего материала для тренировок',
   'Лёгкий танк-топ для интенсивных тренировок.',
   399000, NULL, 'Верх', '{}', ARRAY['S','M','L'], '{}', '92% полиэстер, 8% эластан', 'Машинная стирка 30°', NULL, 7, 5),
  ('night-shift-joggers', 'Night Shift Joggers', 'Утеплённые джоггеры с карманами-молниями',
   'Утеплённые джоггеры из плотного трикотажа.',
   699000, NULL, 'Низ', '{}', ARRAY['S','M','L','XL'], '{}', '80% хлопок, 20% полиэстер', 'Машинная стирка 30°', 'HIT', 9, 6),
  ('dawnbreak-bomber', 'Dawnbreak Bomber', 'Бомбер с атласной подкладкой и нашивкой на рукаве',
   'Премиальный бомбер с атласной подкладкой.',
   1499000, NULL, 'Верх', '{}', ARRAY['S','M','L','XL'], '{}', '100% нейлон', 'Машинная стирка 30°', 'NEW', 4, 7),
  ('urban-grip-socks', 'Urban Grip Socks', 'Компрессионные носки с anti-slip подошвой',
   'Компрессионные носки с анатомическим плетением.',
   179000, NULL, 'Аксессуары', '{}', ARRAY['38-40','41-43','44-46'], '{}', '75% хлопок, 15% полиамид, 10% эластан', 'Машинная стирка 40°', NULL, 20, 8),
  ('battle-crossbody', 'Battle Crossbody', 'Кросс-бэг из водонепроницаемого нейлона',
   'Компактный кросс-бэг из нейлона 500D.',
   549000, NULL, 'Аксессуары', '{}', ARRAY['Универсальный'], '{}', '100% нейлон', 'Протирать влажной тканью', 'NEW', 15, 9),
  ('void-long-sleeve', 'Void Long Sleeve', 'Длинный рукав из тонкого джерси',
   'Тонкий лонгслив из мягкого джерси для межсезонья.',
   599000, NULL, 'Верх', '{}', ARRAY['S','M','L','XL'], '{}', '95% хлопок, 5% эластан', 'Машинная стирка 30°', NULL, 11, 10),
  ('grit-cargo-pants', 'Grit Cargo Pants', 'Карго с 6 карманами и регулируемой штаниной',
   'Многофункциональные карго-штаны с 6 карманами.',
   849000, NULL, 'Низ', '{}', ARRAY['S','M','L','XL'], '{}', '65% хлопок, 35% полиэстер', 'Машинная стирка 30°', 'NEW', 6, 11)
ON CONFLICT (slug) DO NOTHING;
