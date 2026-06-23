/**
 * SOULDAWN — агрегированная статистика для админ-дашборда (Prisma).
 */
import { prisma } from "@/lib/prisma";

const PAID_STATUSES = ["paid", "shipped", "delivered"];

function periodStarts(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  // Прошлые периоды для сравнения (KPI рост)
  const prevWeekStart = new Date(week);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthEnd   = new Date(today.getFullYear(), today.getMonth(), 1);
  return { today, week, month, prevWeekStart, prevMonthStart, prevMonthEnd };
}

export async function computeFullStats(pendingPayments = 0) {
  const { today, week, month, prevWeekStart, prevMonthStart, prevMonthEnd } = periodStarts();
  const onlineThreshold = new Date(Date.now() - 2 * 60 * 1000);

  const [
    totalUsers, onlineUsers,
    newToday, newWeek, newMonth,
    totalOrders, ordersToday, ordersWeek, ordersMonth, pendingOrders,
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

  async function revenue(from?: Date, to?: Date) {
    const r = await prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: PAID_STATUSES },
        ...(from || to ? { createdAt: { ...(from ? { gt: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
      },
    });
    return r._sum.total || 0;
  }
  async function expenses(from?: Date, to?: Date) {
    const r = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: from || to ? { createdAt: { ...(from ? { gt: from } : {}), ...(to ? { lt: to } : {}) } } : {},
    });
    return r._sum.amount || 0;
  }

  const [
    revAll, revToday, revWeek, revMonth,
    expAll, expToday, expWeek, expMonth,
    // Прошлые периоды
    revPrevWeek, revPrevMonth,
    newPrevWeek, newPrevMonth,
    ordersPrevWeek, ordersPrevMonth,
  ] = await Promise.all([
    revenue(), revenue(today), revenue(week), revenue(month),
    expenses(), expenses(today), expenses(week), expenses(month),
    revenue(prevWeekStart, week),
    revenue(prevMonthStart, prevMonthEnd),
    prisma.user.count({ where: { createdAt: { gt: prevWeekStart, lt: week } } }),
    prisma.user.count({ where: { createdAt: { gt: prevMonthStart, lt: prevMonthEnd } } }),
    prisma.order.count({ where: { createdAt: { gt: prevWeekStart, lt: week } } }),
    prisma.order.count({ where: { createdAt: { gt: prevMonthStart, lt: prevMonthEnd } } }),
  ]);

  // График новых пользователей за последние 30 дней
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rawUsers = await prisma.user.findMany({
    where: { createdAt: { gt: thirtyDaysAgo } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  // Группируем по дня
  const usersByDay: Record<string, number> = {};
  for (const u of rawUsers) {
    const day = u.createdAt.toISOString().slice(0, 10);
    usersByDay[day] = (usersByDay[day] || 0) + 1;
  }
  const userGrowthChart = Object.entries(usersByDay).map(([date, count]) => ({ date, count }));

  function pct(curr: number, prev: number) {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  // Воронка заказов по статусам
  const [cntPending, cntPaid, cntShipped, cntDelivered, cntCancelled] = await Promise.all([
    prisma.order.count({ where: { status: "pending" } }),
    prisma.order.count({ where: { status: "paid" } }),
    prisma.order.count({ where: { status: "shipped" } }),
    prisma.order.count({ where: { status: "delivered" } }),
    prisma.order.count({ where: { status: "cancelled" } }),
  ]);

  const ordersFunnel = [
    { name: "Ожидает",   value: cntPending   },
    { name: "Оплачен",   value: cntPaid      },
    { name: "Отправлен",  value: cntShipped   },
    { name: "Доставлен",  value: cntDelivered },
    { name: "Отменён",   value: cntCancelled },
  ].filter((s) => s.value > 0);

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
    growth: {
      revenue_week_pct:  pct(revWeek,    revPrevWeek),
      revenue_month_pct: pct(revMonth,   revPrevMonth),
      users_week_pct:    pct(newWeek,    newPrevWeek),
      users_month_pct:   pct(newMonth,   newPrevMonth),
      orders_week_pct:   pct(ordersWeek, ordersPrevWeek),
      orders_month_pct:  pct(ordersMonth,ordersPrevMonth),
    },
    user_growth_chart: userGrowthChart,
    orders_funnel: ordersFunnel,
  };
}
