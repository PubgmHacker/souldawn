/**
 * SOULDAWN — Prisma Client singleton.
 * Импортируй { prisma } из '@/lib/prisma' везде, где нужен доступ к БД.
 * Singleton предотвращает исчерпание пула соединений при hot-reload в dev.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
