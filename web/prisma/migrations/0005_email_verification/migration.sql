-- SOULDAWN — Email-верификация + email-рассылки.
-- Idempotent: безопасно на чистой и на существующей БД.

ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
