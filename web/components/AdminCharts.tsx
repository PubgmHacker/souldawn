"use client";

import {
  BarChart, Bar,
  LineChart, Line,
  FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
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
  user_growth_chart?: { date: string; count: number }[];
  // Воронка заказов
  orders_funnel?: { name: string; value: number }[];
}

const toRub = (k: number) => Math.round((k || 0) / 100);

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#101014",
    border: "1px solid rgba(232,184,122,0.15)",
    borderRadius: 4,
    fontSize: 12,
    color: "#F2EEE9",
  },
};

const FUNNEL_COLORS = ["#E8B87A", "#D4915C", "#A86A3D", "#4caf50", "#ef5350"];

export default function AdminCharts({ stats }: { stats: ChartStats }) {
  const barData = [
    {
      period: "Сегодня",
      "Выручка": toRub(stats.revenue_today),
      "Расходы":  toRub(stats.expenses_today),
      "Прибыль":  toRub(stats.net_profit_today),
    },
    {
      period: "Неделя",
      "Выручка": toRub(stats.revenue_this_week),
      "Расходы":  toRub(stats.expenses_this_week),
      "Прибыль":  toRub(stats.net_profit_this_week),
    },
    {
      period: "Месяц",
      "Выручка": toRub(stats.revenue_this_month),
      "Расходы":  toRub(stats.expenses_this_month),
      "Прибыль":  toRub(stats.net_profit_this_month),
    },
  ];

  const lineData = (stats.user_growth_chart || []).map((d) => ({
    date: d.date.slice(5),
    count: d.count,
  }));

  const funnelData = stats.orders_funnel || [];

  return (
    <div className="space-y-6">
      {/* Бар чарт */}
      <div className="border border-line bg-surface/50 p-6">
        <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-6">Динамика (₽)</h3>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,238,233,0.06)" />
              <XAxis dataKey="period" stroke="rgba(242,238,233,0.3)" fontSize={11} />
              <YAxis stroke="rgba(242,238,233,0.3)" fontSize={11} width={70}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}т` : String(v)} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v.toLocaleString("ru-RU")} ₽`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Выручка" fill="#E8B87A" radius={[2,2,0,0]} />
              <Bar dataKey="Расходы"  fill="#A86A3D" radius={[2,2,0,0]} />
              <Bar dataKey="Прибыль"  fill="#4caf50" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Воронка заказов */}
      {funnelData.length > 0 && (
        <div className="border border-line bg-surface/50 p-6">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-6">Воронка заказов</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <FunnelChart>
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v} шт.`, ""]} />
                <Funnel dataKey="value" data={funnelData} isAnimationActive>
                  <LabelList position="right" fill="#B7B2AC" fontSize={11}
                    formatter={(v: number, entry: any) => `${entry?.name}: ${v}`} />
                  {funnelData.map((_, i) => (
                    <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                  ))}
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Линейный график новых пользователей */}
      {lineData.length > 0 && (
        <div className="border border-line bg-surface/50 p-6">
          <h3 className="text-[10px] font-bold tracking-widest uppercase text-accent mb-6">
            Новые пользователи (последние 30 дней)
          </h3>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(242,238,233,0.06)" />
                <XAxis dataKey="date" stroke="rgba(242,238,233,0.3)" fontSize={10}
                  interval={Math.floor(lineData.length / 6)} />
                <YAxis stroke="rgba(242,238,233,0.3)" fontSize={10} width={30} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v} чел.`, "Новых"]} />
                <Line type="monotone" dataKey="count" stroke="#E8B87A" strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: "#E8B87A" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
