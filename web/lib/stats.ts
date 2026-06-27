/**
 * SOULDAWN — агрегированная статистика для админ-дашборда (Prisma).
 * Повторяет логику bot/database get_full_stats: выручка считается по
 * заказам в статусах paid/shipped/delivered. Суммы в копейках.
 */
import { prisma } from "@/lib/prisma";

const PAID_STATUSES = ["paid", "shipped", "delivered"];

function periodStarts(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // понедельник
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  return { today, week, month };
}

export async function computeFullStats(pendingPayments = 0) {
  const { today, week, month } = periodStarts();
  const onlineThreshold = new Date(Date.now() - 2 * 60 * 1000);

  const [
    totalUsers,
    onlineUsers,
    newToday,
    newWeek,
    newMonth,
    totalOrders,
    ordersToday,
    ordersWeek,
    ordersMonth,
    pendingOrders,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastSeen: { gt: onlineThreshold } } }),
    prisma.user.count({ where: { createdAt: { gt: today } } }),
    prisma.user.count({ where: { createdAt: { gt: week } } }),
    prisma.user.count({ where: { createdAt: { gt: month } } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gt: today } } }),
    prisma.order.count({ where: { createdAt: { gt: week } } }),
    prisma.order.count({ where: { createdAt: { gt: month } } }),
    prisma.order.count({ where: { status: "pending" } }),
  ]);

  async function revenue(from?: Date) {
    const r = await prisma.order.aggregate({
      _sum: { total: true },
      where: { status: { in: PAID_STATUSES }, ...(from ? { createdAt: { gt: from } } : {}) },
    });
    return r._sum.total || 0;
  }
  async function expenses(from?: Date) {
    const r = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: from ? { createdAt: { gt: from } } : {},
    });
    return r._sum.amount || 0;
  }

  const [revAll, revToday, revWeek, revMonth, expAll, expToday, expWeek, expMonth] =
    await Promise.all([
      revenue(),
      revenue(today),
      revenue(week),
      revenue(month),
      expenses(),
      expenses(today),
      expenses(week),
      expenses(month),
    ]);

  return {
    total_users: totalUsers,
    online_users: onlineUsers,
    new_today: newToday,
    new_this_week: newWeek,
    new_this_month: newMonth,
    total_orders: totalOrders,
    orders_today: ordersToday,
    orders_this_week: ordersWeek,
    orders_this_month: ordersMonth,
    pending_orders: pendingOrders,
    total_revenue: revAll,
    revenue_today: revToday,
    revenue_this_week: revWeek,
    revenue_this_month: revMonth,
    total_expenses: expAll,
    expenses_today: expToday,
    expenses_this_week: expWeek,
    expenses_this_month: expMonth,
    net_profit: revAll - expAll,
    net_profit_today: revToday - expToday,
    net_profit_this_week: revWeek - expWeek,
    net_profit_this_month: revMonth - expMonth,
    db_connected: true,
    pending_payments: pendingPayments,
  };
}
