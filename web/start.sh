#!/bin/bash
# SOULDAWN web (Next.js) — Railway start script.
set -e
echo "=== SOULDAWN WEB START ==="

if [ -z "$DATABASE_URL" ]; then
  echo "!!! DATABASE_URL not set — cannot start without a database !!!"
  exit 1
fi

echo "--> Накатываем таблицы Prisma на PostgreSQL..."
npx prisma db push --accept-data-loss

echo "--> Запускаем веб-сервер Next.js..."
node server.js
