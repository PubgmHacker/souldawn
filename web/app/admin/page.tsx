"use client";

import { useState, useEffect, useRef } from "react";

interface Ticket {
  id: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
  user: { name: string; username?: string; telegramId: string; } | null;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  created_at: string;
}

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "archive">("active");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/admin/tickets");
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (err) {
      console.error("Ошибка загрузки тикетов:", err);
    }
  };

  const loadChatMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/messages?ticketId=${ticketId}`);
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 5000); // Обновляем список каждые 5 сек
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedTicket) return;
    loadChatMessages(selectedTicket.id);
    const interval = setInterval(() => loadChatMessages(selectedTicket.id), 3000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;
    setLoading(true);

    try {
      // 1. Отправляем ответ оператора в чат
      await fetch("/api/tickets/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedTicket.id, sender: "operator", text: replyText }),
      });

      // 2. Помечаем как отвечено и переносим в архив (resolved)
      await fetch(`/api/admin/tickets/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText })
      });

      setReplyText("");
      loadTickets();
      setSelectedTicket(null); // Закрываем окно чата, отправляя в архив
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Фильтруем тикеты по вкладкам
  const activeTickets = tickets.filter(t => t.status === "open" || t.status === "operator");
  const archiveTickets = tickets.filter(t => t.status === "resolved" || t.status === "closed");

  return (
    <div className="min-h-screen bg-[#0e0e10] text-zinc-300 p-4 font-mono selection:bg-amber-500 selection:text-black">
      <div className="text-center my-4">
        <h1 className="text-2xl font-black text-zinc-100 uppercase italic">
          SOUL<span className="text-amber-500">DAWN</span> · ADMIN
        </h1>
        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">// MANAGEMENT_TERMINAL</p>
      </div>

      {selectedTicket ? (
        /* ОКНО ОТКРЫТОГО ТИКЕТА ДЛЯ ПРОСМОТРА ИЛИ ОТВЕТА */
        <div className="flex flex-col h-[calc(100vh-120px)] border border-zinc-800 bg-zinc-950/60 p-3 rounded-sm">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2">
            <button onClick={() => setSelectedTicket(null)} className="text-amber-500 text-xs font-bold bg-transparent border-none cursor-pointer">[ ← К СПИСКУ ]</button>
            <span className="text-[9px] uppercase bg-zinc-900 px-2 py-0.5 border border-zinc-800 text-zinc-400">
              {selectedTicket.status === "resolved" ? "📦 В АРХИВЕ" : "⚡ АКТИВНЫЙ"}
            </span>
          </div>

          {/* Лента сообщений чата */}
          <div className="flex-1 overflow-y-auto space-y-2 p-1 text-xs">
            <div className="bg-zinc-900/60 p-2 border border-zinc-800 text-zinc-400 border-l-2 border-l-amber-500 mb-2">
              <span className="text-[8px] block text-zinc-600 uppercase">// ПЕРВОЕ ОБРАЩЕНИЕ:</span>
              {selectedTicket.message}
            </div>

            {chatMessages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === "operator" ? "items-end" : "items-start"}`}>
                <div className={`p-2 max-w-[85%] rounded-sm ${msg.sender === "operator" ? "bg-amber-500 text-black font-semibold" : "bg-zinc-900 text-zinc-200 border border-zinc-800"}`}>
                  {msg.message}
                </div>
                <span className="text-[7px] text-zinc-600 uppercase mt-0.5">{msg.sender}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Форма ответа (доступна только если тикет еще не в архиве) */}
          {selectedTicket.status !== "resolved" ? (
            <form onSubmit={handleSendReply} className="flex gap-2 border-t border-zinc-800 pt-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Текст ответа в чат..."
                className="flex-1 bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:outline-none focus:border-amber-500 rounded-sm"
              />
              <button type="submit" disabled={loading} className="bg-amber-500 text-black font-black text-xs px-4 border-none rounded-sm cursor-pointer">
                {loading ? "..." : "ОТВЕТИТЬ"}
              </button>
            </form>
          ) : (
            <div className="text-center text-[10px] text-zinc-600 uppercase tracking-wider border-t border-zinc-900 pt-3">
              // Просмотр архивного тикета. Ответ зафиксирован.
            </div>
          )}
        </div>
      ) : (
        /* ГЛАВНЫЙ ЭКРАН ТАБЛИЦЫ ТИКЕТОВ */
        <>
          <div className="flex border border-zinc-800 bg-zinc-900/40 mb-4 p-1 rounded-sm">
            <button onClick={() => setActiveTab("active")} className={`flex-1 py-3 text-center text-xs uppercase font-black cursor-pointer border-none ${activeTab === "active" ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "text-zinc-500"}`}>
              [ АКТИВНЫЕ ({activeTickets.length}) ]
            </button>
            <button onClick={() => setActiveTab("archive")} className={`flex-1 py-3 text-center text-xs uppercase font-black cursor-pointer border-none ${activeTab === "archive" ? "bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.2)]" : "text-zinc-500"}`}>
              [ АРХИВ ({archiveTickets.length}) ]
            </button>
          </div>

          <div className="space-y-3">
            {(activeTab === "active" ? activeTickets : archiveTickets).length === 0 ? (
              <div className="border border-dashed border-zinc-800 p-8 text-center text-zinc-600 text-xs uppercase tracking-wider">// Запросы отсутствуют.</div>
            ) : (
              (activeTab === "active" ? activeTickets : archiveTickets).map((ticket) => (
                <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="bg-zinc-900/20 border border-zinc-800 p-3 space-y-2 rounded-sm border-l-2 border-l-zinc-700 cursor-pointer hover:border-amber-500/40 transition-all">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-zinc-400 uppercase bg-zinc-900 px-1.5 border border-zinc-800">
                      {ticket.user ? ticket.user.name : "Посетитель"}
                    </span>
                    <span className="text-zinc-600">ID: #{ticket.id.slice(-5)}</span>
                  </div>
                  <p className="text-xs text-zinc-300 truncate pr-2">{ticket.message}</p>
                  <div className="text-[8px] text-zinc-600 text-right uppercase pt-1 border-t border-zinc-900/40">
                    {new Date(ticket.createdAt).toLocaleString("ru-RU")}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
