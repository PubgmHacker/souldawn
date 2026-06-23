"use client";

import { useState, useEffect, useRef } from "react";

interface Ticket {
  id: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  created_at: string;
}

export default function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [chatText, setChatText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  // Для сайта используем фиксированный тестовый ID или ID из сессии (если юзер авторизован)
  const testTelegramId = "8340654471"; 
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Получение сообщений по открытому тикету
  const loadMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/messages?ticketId=${ticketId}`);
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
    } catch (err) {
      console.error(err);
    }
  };

  // Проверяем, есть ли уже активный открытый тикет у пользователя при старте
  const checkActiveTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/history?telegramId=${testTelegramId}`);
      const data = await res.json();
      if (data.tickets && data.tickets.length > 0) {
        // Берем самый свежий открытый тикет
        const openTicket = data.tickets.find((t: Ticket) => t.status === "open");
        if (openTicket) setActiveTicket(openTicket);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) checkActiveTicket();
  }, [isOpen]);

  // Интеграция автообновления сообщений в чате (раз в 3 секунды)
  useEffect(() => {
    if (!activeTicket) return;
    loadMessages(activeTicket.id);
    const interval = setInterval(() => loadMessages(activeTicket.id), 3000);
    return () => clearInterval(interval);
  }, [activeTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Создание нового обращения
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramId: testTelegramId, category, message }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("");
        checkActiveTicket(); // Переключаем на окно чата
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Отправка текстового ответа в чат
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !chatText.trim()) return;
    const textToSend = chatText;
    setChatText("");

    try {
      await fetch("/api/tickets/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: activeTicket.id, sender: "user", text: textToSend }),
      });
      loadMessages(activeTicket.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-mono">
      {/* 3D-Кнопка вызова чата (Янтарь + Металл) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-zinc-900 text-amber-500 border-2 border-amber-500/80 px-5 py-4 uppercase text-xs font-black tracking-widest shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:bg-amber-500 hover:text-black hover:scale-105 active:scale-95 transition-all rounded-sm cursor-pointer"
        >
          ⚡ [ ЧАТ_ПОДДЕРЖКИ ]
        </button>
      )}

      {/* Окно Живого Чата */}
      {isOpen && (
        <div className="w-85 h-112 bg-[#0e0e10] border-2 border-zinc-800 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col rounded-sm overflow-hidden text-zinc-300">
          {/* Header */}
          <div className="bg-zinc-900 p-3 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex flex-col items-start">
              <span className="text-xs font-black uppercase text-zinc-100 tracking-wider">SOUL<span className="text-amber-500">DAWN</span> SUPPORT</span>
              <span className="text-[8px] text-zinc-500 uppercase">// LIVE_CONNECT_OK</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-amber-500 text-xs font-bold bg-transparent border-none cursor-pointer"
            >
              [X]
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-3 overflow-y-auto text-xs space-y-3">
            {activeTicket ? (
              /* ЕСЛИ ТИКЕТ ОТКРЫТ: Показываем окно переписки */
              <div className="flex flex-col h-full justify-between">
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[260px]">
                  <div className="bg-zinc-950 p-2 border border-zinc-900 text-zinc-400 border-l-2 border-l-amber-500 mb-3">
                    <span className="text-[8px] block text-zinc-600 uppercase">// Описание проблемы:</span>
                    {activeTicket.message}
                  </div>

                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                      <div className={`p-2 max-w-[85%] rounded-sm ${msg.sender === "user" ? "bg-amber-500 text-black font-semibold" : "bg-zinc-900 text-zinc-200 border border-zinc-800"}`}>
                        {msg.message}
                      </div>
                      <span className="text-[7px] text-zinc-600 uppercase mt-0.5">{msg.sender}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Поле ввода сообщения в открытый чат */}
                <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-zinc-900 pt-2 bg-[#0e0e10]">
                  <input
                    type="text"
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Напишите ответ..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:outline-none focus:border-amber-500 rounded-sm"
                  />
                  <button type="submit" className="bg-amber-500 text-black font-black text-[10px] px-3 border-none rounded-sm cursor-pointer">ОТПРАВИТЬ</button>
                </form>
              </div>
            ) : (
              /* ЕСЛИ ТИКЕТА НЕТ: Показываем форму создания обращения */
              <form onSubmit={handleCreateTicket} className="space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wide leading-relaxed">
                    // У вас нет активных диалогов. Опишите вашу проблему, чтобы начать сессию с ассистентом или оператором.
                  </p>
                  <div>
                    <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1">// КАТЕГОРИЯ</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500 rounded-sm cursor-pointer"
                    >
                      <option value="general">ОБЩИЕ ВОПРОСЫ</option>
                      <option value="order">ПРОБЛЕМА С ЗАКАЗОМ</option>
                      <option value="delivery">ДОСТАВКА И ЛОГИСТИКА</option>
                      <option value="return">ОБМЕН И ВОЗВРАТ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase text-zinc-500 font-bold mb-1">// ТЕКСТ ОБРАЩЕНИЯ</label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Введите сообщение..."
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none rounded-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-transparent border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black font-black py-3 uppercase tracking-widest text-[10px] disabled:opacity-30 rounded-sm cursor-pointer transition-all"
                >
                  {loading ? "⚡ ПОДКЛЮЧЕНИЕ..." : "⚙️ НАЧАТЬ ДИАЛОГ"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
