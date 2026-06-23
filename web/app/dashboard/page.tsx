"use client";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e10] flex items-center justify-center font-mono text-zinc-500 uppercase tracking-widest animate-pulse">
        // ЗАГРУЗКА_ТЕРМИНАЛА_SOULDAWN...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e10] text-zinc-300 p-6 font-mono selection:bg-amber-500 selection:text-black">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="border-b border-zinc-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-white tracking-wider uppercase italic">
              SOUL<span className="text-amber-500">DAWN</span> · CORE
            </h1>
            <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">// USER_DASHBOARD_STABLE</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-amber-500 bg-amber-950/20 px-2 py-1 border border-amber-500/20 rounded-sm">
              {user?.email || "SYSTEM_USER"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-zinc-800 bg-zinc-900/20 p-4 rounded-sm">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">// ЛИЧНЫЕ ДАННЫЕ</h3>
            <p className="text-sm text-zinc-200"><b>Имя:</b> {user?.name || "Покупатель SOULDAWN"}</p>
            <p className="text-sm text-zinc-200 mt-1"><b>Статус аккаунта:</b> <span className="text-green-400">АКТИВЕН ✅</span></p>
          </div>
          <div className="border border-zinc-800 bg-zinc-900/20 p-4 rounded-sm">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">// СТАТИСТИКА ЗАКАЗОВ</h3>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">// Нет активных заказов в вашей сессии.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
