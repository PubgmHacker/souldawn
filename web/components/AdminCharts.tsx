"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface ChartStats {
  revenue_today: number;
  revenue_this_week: number;
  revenue_this_month: number;
  expenses_today: number;
  expenses_this_week: number;
  expenses_this_month: number;
  net_profit_today: number;
  net_profit_this_week: number;
  net_profit_this_month: number;
}

const toRub = (kopecks: number) => Math.round((kopecks || 0) / 100);

export default function AdminCharts({ stats }: { stats: ChartStats }) {
  const data = [
    {
      period: "Сегодня",
      Выручка: toRub(stats.revenue_today),
      Расходы: toRub(stats.expenses_today),
      Прибыль: toRub(stats.net_profit_today),
    },
    {
      period: "Неделя",
      Выручка: toRub(stats.revenue_this_week),
      Расходы: toRub(stats.expenses_this_week),
      Прибыль: toRub(stats.net_profit_this_week),
    },
    {
      period: "Месяц",
      Выручка: toRub(stats.revenue_this_month),
      Расходы: toRub(stats.expenses_this_month),
      Прибыль: toRub(stats.net_profit_this_month),
    },
  ];

  return (
    <div className="border border-white/5 bg-surface/50 p-6">
      <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-6">
        Динамика (₽)
      </h3>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="period" stroke="rgba(255,255,255,0.4)" fontSize={11} />
            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} width={70} />
            <Tooltip
              contentStyle={{
                background: "#111",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: 12,
              }}
              formatter={(v: number) => `${v.toLocaleString("ru-RU")} ₽`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Выручка" fill="#c8a45e" />
            <Bar dataKey="Расходы" fill="#8B2500" />
            <Bar dataKey="Прибыль" fill="#4caf50" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
