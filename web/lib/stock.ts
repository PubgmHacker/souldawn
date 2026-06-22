/**
 * SOULDAWN — атомарное управление остатками склада.
 *
 * Главный принцип: проверка «хватает ли остатка» и его списание выполняются
 * одним условным UPDATE (WHERE stock >= qty). Это исключает TOCTOU/oversell
 * при параллельных заказах на уровне БД, без блокировок приложения.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface StockLine {
  id: string;
  qty: number;
}

export class OutOfStockError extends Error {
  constructor(public readonly productId: string) {
    super(`OUT_OF_STOCK:${productId}`);
    this.name = "OutOfStockError";
  }
}

/**
 * Списывает остатки атомарно в рамках одной транзакции.
 * Позиции сортируются по id — детерминированный порядок блокировок
 * предотвращает deadlock между параллельными заказами.
 * Бросает OutOfStockError — транзакция откатывается целиком.
 */
export async function decrementStock(
  lines: StockLine[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  const run = async (client: Prisma.TransactionClient) => {
    const sorted = [...lines].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const line of sorted) {
      if (!Number.isInteger(line.qty) || line.qty <= 0) {
        throw new OutOfStockError(line.id);
      }
      const res = await client.product.updateMany({
        where: { id: line.id, stock: { gte: line.qty } },
        data: { stock: { decrement: line.qty } },
      });
      if (res.count === 0) throw new OutOfStockError(line.id);
    }
  };

  if (tx) {
    await run(tx);
  } else {
    await prisma.$transaction((client) => run(client));
  }
}

/** Возвращает остатки на склад (при отмене оплаченного/списанного заказа). */
export async function restoreStock(
  lines: StockLine[],
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  for (const line of lines) {
    if (!Number.isInteger(line.qty) || line.qty <= 0) continue;
    await client.product.updateMany({
      where: { id: line.id },
      data: { stock: { increment: line.qty } },
    });
  }
}
