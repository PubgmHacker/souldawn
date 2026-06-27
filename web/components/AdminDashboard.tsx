"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface DashboardStats {
  total_users: number;
  online_users: number;
  new_today: number;
  total_orders: number;
  orders_today: number;
  pending_orders: number;
  total_revenue: number;
  revenue_today: number;
  net_profit: number;
  db_connected: boolean;
}

interface Order {
  id: string;
  items: any;
  total: number;
  status: string;
  created_at: string;
  username?: string;
  name?: string;
}

interface DashboardUser {
  id: string;
  telegram_id: number;
  username: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  last_seen?: string;
}

type Tab = "overview" | "orders" | "users" | "analytics";

const statCard = (
  title: string,
  value: any,
  icon: string,
  trend?: number,
  subtext?: string
) => ({
  title,
  value,
  icon,
  trend,
  subtext,
});

export default function AdminDashboard({
  adminId,
  role,
}: {
  adminId: number;
  role?: string;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const opts: RequestInit = {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      };

      const [statsRes, ordersRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats", opts),
        fetch("/api/admin/recent-orders", opts),
        fetch("/api/admin/users", opts),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const filteredOrders = orders.filter((order) => {
    if (filter === "pending")
      return order.status === "pending" || order.status === "processing";
    if (filter === "completed")
      return order.status === "delivered" || order.status === "paid";
    return true;
  });

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString("ru-RU", {
      maximumFractionDigits: 0,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
      case "processing":
        return "bg-yellow-500/10 text-yellow-400";
      case "paid":
      case "shipped":
        return "bg-blue-500/10 text-blue-400";
      case "delivered":
        return "bg-accent/10 text-accent";
      case "cancelled":
        return "bg-red-500/10 text-red-400";
      default:
        return "bg-white/10 text-white";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Ожидает";
      case "processing":
        return "Обработка";
      case "paid":
        return "Оплачен";
      case "shipped":
        return "Отправлен";
      case "delivered":
        return "Доставлен";
      case "cancelled":
        return "Отменён";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-2">
            Администратор
          </p>
          <h1 className="text-4xl font-black uppercase">Дашборд</h1>
        </div>
        <div className="text-right">
          {!stats?.db_connected && (
            <div className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-[10px] font-bold tracking-wide">
              БД НЕ ПОДКЛЮЧЕНА
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {(["overview", "orders", "users", "analytics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-xs font-bold tracking-wider uppercase transition-colors ${
              tab === t
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-text"
            }`}
          >
            {t === "overview"
              ? "Обзор"
              : t === "orders"
              ? "Заказы"
              : t === "users"
              ? "Пользователи"
              : "Аналитика"}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Users */}
            <div className="border border-white/10 bg-surface/50 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1">
                    Пользователей
                  </p>
                  <p className="text-2xl font-black">{stats?.total_users || 0}</p>
                  {stats?.new_today ? (
                    <p className="text-[10px] text-accent mt-1">
                      +{stats.new_today} сегодня
                    </p>
                  ) : null}
                </div>
                <div className="text-2xl">👥</div>
              </div>
              {stats?.online_users ? (
                <div className="pt-3 border-t border-white/10 text-[10px] text-muted">
                  {stats.online_users} онлайн
                </div>
              ) : null}
            </div>

            {/* Orders */}
            <div className="border border-white/10 bg-surface/50 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1">
                    Заказов
                  </p>
                  <p className="text-2xl font-black">{stats?.total_orders || 0}</p>
                  {stats?.orders_today ? (
                    <p className="text-[10px] text-accent mt-1">
                      +{stats.orders_today} сегодня
                    </p>
                  ) : null}
                </div>
                <div className="text-2xl">📦</div>
              </div>
              {stats?.pending_orders ? (
                <div className="pt-3 border-t border-white/10 text-[10px] text-yellow-400">
                  {stats.pending_orders} в ожидании
                </div>
              ) : null}
            </div>

            {/* Revenue */}
            <div className="border border-white/10 bg-surface/50 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1">
                    Выручка
                  </p>
                  <p className="text-2xl font-black">
                    {formatPrice(stats?.total_revenue || 0)} ₽
                  </p>
                  {stats?.revenue_today ? (
                    <p className="text-[10px] text-accent mt-1">
                      +{formatPrice(stats.revenue_today)} сегодня
                    </p>
                  ) : null}
                </div>
                <div className="text-2xl">💰</div>
              </div>
            </div>

            {/* Profit */}
            <div className="border border-white/10 bg-surface/50 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-[10px] text-muted font-bold tracking-wider uppercase mb-1">
                    Прибыль
                  </p>
                  <p className="text-2xl font-black">
                    {formatPrice(stats?.net_profit || 0)} ₽
                  </p>
                </div>
                <div className="text-2xl">📈</div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="border border-white/10 bg-surface/50 p-6">
            <h3 className="text-xs font-bold tracking-wider uppercase text-accent mb-4">
              Последние заказы
            </h3>
            {orders.length === 0 ? (
              <p className="text-sm text-muted">Заказов нет</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="border border-white/5 p-3 hover:bg-white/5 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-bold">#{order.id}</p>
                        <p className="text-[10px] text-muted">
                          {order.name || order.username || "Unknown"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatPrice(order.total)} ₽</p>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-1 mt-1 ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {tab === "orders" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["all", "pending", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-xs font-bold tracking-wider uppercase transition-colors ${
                  filter === f
                    ? "bg-accent text-bg"
                    : "border border-white/10 hover:border-white/20"
                }`}
              >
                {f === "all"
                  ? "Все"
                  : f === "pending"
                  ? "В ожидании"
                  : "Завершённые"}
              </button>
            ))}
          </div>

          <div className="border border-white/10 bg-surface/50 p-6">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-muted py-8">Заказы не найдены</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                        ID
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                        Клиент
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                        Сумма
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                        Статус
                      </th>
                      <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                        Дата
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <span className="font-bold text-accent">#{order.id}</span>
                        </td>
                        <td className="py-3 px-2">
                          {order.name || order.username || "Unknown"}
                        </td>
                        <td className="py-3 px-2 font-bold">
                          {formatPrice(order.total)} ₽
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-block px-2 py-1 text-[10px] font-bold ${getStatusColor(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-muted">
                          {new Date(order.created_at).toLocaleDateString("ru-RU")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="border border-white/10 bg-surface/50 p-6">
          {users.length === 0 ? (
            <p className="text-center text-muted py-8">Пользователей не найдено</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10">
                  <tr>
                    <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                      ID
                    </th>
                    <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                      Имя
                    </th>
                    <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                      Username
                    </th>
                    <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                      Роль
                    </th>
                    <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                      Присоединился
                    </th>
                    <th className="text-left py-3 px-2 font-bold text-[10px] tracking-wider uppercase">
                      Последний вход
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-2 font-bold text-accent">
                        {user.telegram_id}
                      </td>
                      <td className="py-3 px-2">{user.name || "-"}</td>
                      <td className="py-3 px-2 text-muted">@{user.username || "-"}</td>
                      <td className="py-3 px-2">
                        {user.is_admin ? (
                          <span className="px-2 py-1 bg-accent/20 text-accent text-[10px] font-bold rounded">
                            Админ
                          </span>
                        ) : (
                          <span className="text-muted text-[10px]">Пользователь</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-[10px] text-muted">
                        {new Date(user.created_at).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="py-3 px-2 text-[10px] text-muted">
                        {user.last_seen
                          ? new Date(user.last_seen).toLocaleDateString("ru-RU")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="border border-white/10 bg-surface/50 p-6">
            <h3 className="text-xs font-bold tracking-wider uppercase text-accent mb-4">
              Статистика по времени
            </h3>
            <div className="text-center py-12">
              <p className="text-muted">
                Аналитика будет доступна после интеграции графиков
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
