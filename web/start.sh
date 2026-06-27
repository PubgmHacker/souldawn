#!/bin/bash
# SOULDAWN web (Next.js) — Railway start script.
set -e
echo "=== SOULDAWN WEB START ==="

PRISMA="node node_modules/prisma/build/index.js"

if [ -z "$DATABASE_URL" ]; then
  echo "!!! DATABASE_URL not set — cannot start without a database !!!"
  exit 1
fi

# База могла быть создана Python-ботом (таблицы есть, но история
# _prisma_migrations пуста). В таком случае `migrate deploy` падает (P3005:
# database schema is not empty). Пробуем deploy; если он падает из-за
# непустой схемы — проставляем baseline первой миграции (она
# IF NOT EXISTS — таблицы бота не затрагиваются) и повторяем deploy,
# чтобы доехали 0002+ (identities, notify_email, email_verified и т.д.).
echo "Applying Prisma migrations..."
if ! $PRISMA migrate deploy; then
  echo "migrate deploy failed — attempting baseline for an existing (bot-created) DB..."
  $PRISMA migrate resolve --applied 0001_init
  echo "Baseline applied. Re-running migrate deploy..."
  $PRISMA migrate deploy
fi

# Start the standalone Next.js server. Railway provides $PORT.
export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"
echo "Starting Next.js on port $PORT..."
exec node server.js
