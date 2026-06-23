"use client";

import { useState, useEffect } from "react";

interface Ticket {
  id: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function SupportPage() {
  const [tgId, setTgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Ticket[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const webApp = (window as any).Telegram.WebApp;
      webApp.ready();
      webApp.expand();
      
      webApp.setHeaderColor("#0e0e10");
      webApp.setBackgroundColor("#0e0e10");

      const user = webApp.initDataUnsafe?.user;
      if (user?.id) {
        setTgId(user.id.toString());
      } else {
        setTgId("8340654471");
      }
    }
  }, []);

  const loadHistory = async () => {
    if (!tgId) return;
    try {
      const res = await fetch(`/api/tickets/history?telegramId=${tgId}`);
      const data = await res.json();
      if (data.tickets) setHistory(data.tickets);
    } catch (err) {
      console.error("Ошибка загрузки истории:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab, tgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tgId || !message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: tgId, category, message }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("");
        setActiveTab("history");
      } else {
        alert(`Ошибка: ${data.error}`);
      }
    } catch (err) {
      alert("Не удалось отправить запрос");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* fixed inset-0 и bg-[#0e0e10] полностью перекрывают основной сайт, каталог и меню */
    <div className="fixed inset-0 z-[99999] bg-[#0e0e10] text-zinc-300 p-4 font-mono selection:bg-amber-500 selection:text-black overflow-y-auto">
      
      {/* Шапка интерфейса поддержки */}
      <div className="text-center my-6 space-y-1">
        <h1 className="text-3xl font-black tracking-wider text-zinc-100 uppercase italic">
          SOUL<span className="text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.4)]">DAWN</span>
        </h1>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
          // AMBER_SUPPORT_TERMINAL_ISOLATED
        </p>
      </div>

      {/* Переключатель разделов */}
      <div className="flex border border-zinc-800 bg-zinc-900/40 backdrop-blur mb-6 p-1 rounded-sm">
        <button
          onClick={() => setActiveTab("create")}
          type="button"
          className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-black transition-all border-none cursor-pointer ${
            activeTab === "create" 
              ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          [ Написать ]
        </button>
        <button
          onClick={() => setActiveTab("history")}
          type="button"
          className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-black transition-all border-none cursor-pointer ${
            activeTab === "history" 
              ? "bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]" 
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          [ История ({history.length}) ]
        </button>
      </div>

      {/* Форма создания тикета */}
      {activeTab === "create" && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
              // ТЕХНИЧЕСКАЯ КАТЕГОРИЯ
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all cursor-pointer rounded-sm"
            >
              <option value="general">ОБЩИЕ ВОПРОСЫ</option>
              <option value="order">ПРОБЛЕМА С ЗАКАЗОМ</option>
              <option value="delivery">ДОСТАВКА И ЛОГИСТИКА</option>
              <option value="return">ОБМЕН И ВОЗВРАТ</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
              // СУТЬ ОБРАЩЕНИЯ
            </label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите вашу проблему максимально подробно..."
              className="w-full bg-zinc-900 border border-zinc-800 p-3 text-sm text-zinc-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-zinc-600 resize-none rounded-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-transparent border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-black py-4 transition-all uppercase tracking-widest text-xs disabled:opacity-30 active:scale-[0.99] rounded-sm cursor-pointer"
          >
            {loading ? "⚡ СИНХРОНИЗАЦИЯ..." : "⚙️ ОТПРАВИТЬ ЗАПРОС"}
          </button>
        </form>
      )}

      {/* История обращений */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="border border-dashed border-zinc-800 p-8 text-center text-zinc-600 text-xs uppercase tracking-wider">
              История обращений пуста.
            </div>
          ) : (
            history.map((ticket) => (
              <div 
                key={ticket.id} 
                className="bg-zinc-900/60 border border-zinc-800 p-4 space-y-3 relative overflow-hidden rounded-sm border-l-4 border-l-zinc-500"
              >
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 bg-zinc-900 px-2 py-0.5 border border-zinc-800">
                    {ticket.category === "order" ? "📦 Заказ" : ticket.category === "return" ? "🔄 Возврат" : "💬 Вопрос"}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border rounded-sm ${
                      ticket.status === "open" 
                        ? "bg-amber-950/40 text-amber-400 border-amber-500/20" 
                        : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    {ticket.status === "open" ? "В обработке" : "Решено"}
                  </span>
                </div>
                
                <p className="text-xs text-zinc-300 leading-relaxed break-words pr-2">
                  {ticket.message}
                </p>
                
                <div className="flex justify-between items-center text-[9px] text-zinc-600 uppercase pt-2 border-t border-zinc-800/40">
                  <span>ID: #{ticket.id.slice(-6)}</span>
                  <span>{new Date(ticket.createdAt).toLocaleString("ru-RU")}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
