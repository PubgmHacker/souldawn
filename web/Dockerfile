FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bunx prisma generate
RUN bun run build
RUN mkdir -p /data
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/souldawn.db
CMD ["sh", "-c", "bunx prisma generate && bun .next/standalone/server.js"]
