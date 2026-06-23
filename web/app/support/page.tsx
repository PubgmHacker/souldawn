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

  // Извлекаем Telegram ID из Mini App WebApp context
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const webApp = (window as any).Telegram.WebApp;
      webApp.ready();
      const user = webApp.initDataUnsafe?.user;
      if (user?.id) {
        setTgId(user.id.toString());
      } else {
        setTgId("8340654471"); // Тестовый ID из логов для локальной разработки
      }
    }
  }, []);

  // Загрузка истории обращений
  const loadHistory = async () => {
    if (!tgId) return;
    try {
      const res = await fetch(`/api/tickets/history?telegramId=${tgId}`);
      const data = await res.json();
      if (data.tickets) setHistory(data.tickets);
    } catch (err) {
      console.error("Ошибка загрузки истории тикетов:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "history") loadHistory();
  }, [activeTab, tgId]);

  // Отправка нового тикета
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
        alert("Запрос успешно отправлен операторам!");
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
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <h1 className="text-2xl font-bold text-center mb-6 uppercase tracking-wider text-red-500">
        Служба поддержки SOULDAWN
      </h1>

      {/* Переключатель вкладок */}
      <div className="flex border-b border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "create" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-500"
          }`}
        >
          Создать запрос
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-3 text-center font-medium ${
            activeTab === "history" ? "text-red-500 border-b-2 border-red-500" : "text-zinc-500"
          }`}
        >
          История ({history.length})
        </button>
      </div>

      {/* Вкладка: Создание запроса */}
      {activeTab === "create" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-2 font-bold">Категория вопроса</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:outline-none focus:border-red-500"
            >
              <option value="general">Общие вопросы</option>
              <option value="order">Проблема с заказом</option>
              <option value="delivery">Доставка и получение</option>
              <option value="return">Возврат товара</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-2 font-bold">Опишите вашу проблему</label>
            <textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите текст обращения..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white focus:outline-none focus:border-red-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded transition-all uppercase tracking-wide disabled:opacity-50"
          >
            {loading ? "Отправка..." : "Отправить обращение"}
          </button>
        </form>
      )}

      {/* Вкладка: История */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <p className="text-center text-zinc-500 mt-8">У вас пока нет открытых или завершенных обращений.</p>
          ) : (
            history.map((ticket) => (
              <div key={ticket.id} className="bg-zinc-900 border border-zinc-800 rounded p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase bg-zinc-800 text-zinc-300 px-2 py-1 rounded">
                    {ticket.category === "order" ? "📦 Заказ" : ticket.category === "return" ? "🔄 Возврат" : "💬 Общее"}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                      ticket.status === "open" ? "bg-amber-500/20 text-amber-400" : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {ticket.status === "open" ? "В обработке" : "Решено"}
                  </span>
                </div>
                <p className="text-sm text-zinc-200">{ticket.message}</p>
                <div className="text-[10px] text-zinc-500">
                  {new Date(ticket.createdAt).toLocaleString("ru-RU")}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
