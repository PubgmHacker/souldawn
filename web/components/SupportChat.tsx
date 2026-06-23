"use client";
import { useState, useEffect, useRef } from "react";

interface Ticket { id: string; category: string; message: string; status: string; createdAt: string; }
interface ChatMessage { id: string; sender: string; message: string; created_at: string; }

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [isOperatorConnected, setIsOperatorConnected] = useState(false);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [chatText, setChatText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkUserSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data && (data.telegram_id || data.telegramId)) {
            setTelegramId(String(data.telegram_id || data.telegramId));
          }
        }
      } catch (err) { console.error(err); } finally { setIsAuthLoading(false); }
    }
    if (isOpen) checkUserSession();
  }, [isOpen]);

  const loadMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/messages?ticketId=${ticketId}`);
      const data = await res.json();
      if (data.messages) {
        setChatMessages(data.messages);
        if (data.messages.some((m: ChatMessage) => m.sender === "operator")) setIsOperatorConnected(true);
      }
    } catch (err) { console.error(err); }
  };

  const checkActiveTicket = async () => {
    if (!telegramId) return;
    try {
      const res = await fetch(`/api/tickets/history?telegramId=${telegramId}`);
      const data = await res.json();
      if (data.tickets && data.tickets.length > 0) {
        const openTicket = data.tickets.find((t: Ticket) => t.status === "open");
        if (openTicket) setActiveTicket(openTicket);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (telegramId) checkActiveTicket(); }, [telegramId]);

  useEffect(() => {
    if (!activeTicket) return;
    loadMessages(activeTicket.id);
    const interval = setInterval(() => loadMessages(activeTicket.id), 3000);
    return () => clearInterval(interval);
  }, [activeTicket]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault(); if (!telegramId || !message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId, category, message }) });
      const data = await res.json();
      if (data.success) { setMessage(""); checkActiveTicket(); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!activeTicket || !chatText.trim()) return;
    const textToSend = chatText; setChatText("");
    try {
      await fetch("/api/tickets/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: activeTicket.id, sender: "user", text: textToSend }) });
      loadMessages(activeTicket.id);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-mono text-zinc-300">
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="relative w-14 h-14 bg-zinc-900 border-2 border-amber-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-110 hover:border-amber-400 active:scale-95 transition-all cursor-pointer group">
          <span className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping pointer-events-none"></span>
          <span className="text-amber-500 group-hover:text-amber-400 text-lg font-black font-sans">💬</span>
        </button>
      )}

      {isOpen && (
        <div className="w-85 h-112 bg-[#0e0e10] border-2 border-zinc-800 shadow-[0_10px_50px_rgba(0,0,0,0.9)] flex flex-col rounded-sm overflow-hidden">
          <div className="bg-zinc-900 p-3 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex flex-col items-start text-left">
              <span className="text-xs font-black uppercase text-zinc-100 tracking-wider">SOUL<span className="text-amber-500">DAWN</span> HELP</span>
              {activeTicket && (
                <span className={`text-[8px] font-bold uppercase tracking-widest bg-zinc-950 px-1 border border-zinc-800 mt-0.5 ${isOperatorConnected ? "text-zinc-300" : "text-amber-400 animate-pulse"}`}>
                  {isOperatorConnected ? "👨‍💻 МЕНЕДЖЕР: ПОДКЛЮЧЕН" : "🤖 ИИ_АГЕНТ: ОНЛАЙН"}
                </span>
              )}
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-amber-500 text-xs font-bold bg-transparent border-none cursor-pointer">[X]</button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto text-xs flex flex-col">
            {isAuthLoading ? (
              <div className="m-auto text-[10px] text-zinc-500 uppercase tracking-widest animate-pulse">// ПРОВЕРКА_СЕССИИ...</div>
            ) : !telegramId ? (
              <div className="m-auto text-center space-y-4 p-2">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider leading-relaxed">🔒 Для синхронизации чата с Telegram и Mini App, пожалуйста, войдите в свой Личный Кабинет на сайте через Telegram.</p>
                <a href="/profile" className="inline-block bg-transparent border border-amber-500 text-amber-500 font-black text-[10px] tracking-widest px-4 py-3 uppercase hover:bg-amber-500 hover:text-black transition-all rounded-sm text-none">[ Войти в профиль ]</a>
              </div>
            ) : activeTicket ? (
              <div className="flex flex-col h-full justify-between flex-1">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[240px]">
                  <div className="bg-zinc-950 p-2 border border-zinc-900 text-zinc-400 border-l-2 border-l-amber-500 mb-2"><span className="text-[8px] block text-zinc-600 uppercase">// Запрос:</span>{activeTicket.message}</div>
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                      <div className={`p-2 max-w-[85%] rounded-sm ${msg.sender === "user" ? "bg-amber-500 text-black font-semibold" : "bg-zinc-900 text-zinc-200 border border-zinc-800"}`}>{msg.message}</div>
                      <span className="text-[7px] text-zinc-600 uppercase mt-0.5">{msg.sender}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-zinc-900 pt-2">
                  <input type="text" value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Напишите ответ..." className="flex-1 bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:outline-none focus:border-amber-500 rounded-sm" />
                  <button type="submit" className="bg-amber-500 text-black font-black text-[10px] px-3 border-none rounded-sm cursor-pointer">ОТПРАВИТЬ</button>
                </form>
              </div>
            ) : (
              <form onSubmit={handleCreateTicket} className="space-y-4 h-full flex flex-col justify-between flex-1">
                <div className="space-y-3">
                  <p className="text-[10px] text-amber-500/60 uppercase tracking-wide">// СИНХРОНИЗАЦИЯ С ЛК УСПЕШНА</p>
                  <div>
                    <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1">// КАТЕГОРИЯ</label>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 rounded-sm"><option value="general">ОБЩИЕ ВОПРОСЫ</option><option value="order">ПРОБЛЕМА С ЗАКАЗОМ</option><option value="delivery">ДОСТАВКА И ЛОГИСТИКА</option><option value="return">ОБМЕН И ВОЗВРАТ</option></select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1">// ТЕКСТ ОБРАЩЕНИЯ</label>
                    <textarea required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Введите сообщение..." className="w-full bg-zinc-900 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none rounded-sm" />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-transparent border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-black py-3 uppercase tracking-widest text-[10px] disabled:opacity-30 rounded-sm cursor-pointer">{loading ? "⚡ ПОДКЛЮЧЕНИЕ..." : "⚙️ НАЧАТЬ ДИАЛОГ"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
