# ---- deps ----
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- build ----
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL is only needed at runtime; a dummy lets `prisma generate` + build run.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npx prisma generate && npm run build

# ---- runner ----
FROM node:20-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Prisma schema for `migrate deploy` at startup
COPY --from=builder /app/prisma ./prisma
# Полный node_modules из builder поверх standalone: нужен для Prisma CLI
# (`migrate deploy`) со всеми транзитивными зависимостями
# (@prisma/config -> effect и др.), которых нет в standalone.
COPY --from=builder /app/node_modules ./node_modules
COPY start.sh ./start.sh

EXPOSE 3000
CMD ["bash", "start.sh"]
