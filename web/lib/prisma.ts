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
    // Таймауты транзакций: не держим соединения и блокировки бесконечно.
    transactionOptions: {
      maxWait: 5000, // ожидание свободного соединения из пула
      timeout: 10000, // максимальная длительность транзакции
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
