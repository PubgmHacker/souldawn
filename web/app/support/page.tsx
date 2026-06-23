"use client";
import { useState, useEffect, useRef } from "react";

export default function SupportPage() {
  const [tgId, setTgId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"create" | "history">("create");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [chatText, setChatText] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Telegram?.WebApp) {
      const webApp = (window as any).Telegram.WebApp;
      webApp.ready(); webApp.expand();
      webApp.setHeaderColor("#0e0e10"); webApp.setBackgroundColor("#0e0e10");
      const user = webApp.initDataUnsafe?.user;
      if (user?.id) {
        setTgId(user.id.toString());
        setUserProfile({ id: user.id.toString(), username: user.username, first_name: user.first_name, last_name: user.last_name, photo_url: user.photo_url });
      } else {
        setTgId("8340654471");
        setUserProfile({ id: "8340654471", username: "shoppingpharmaa", first_name: "Soul", last_name: "Dawn", photo_url: "" });
      }
    }
  }, []);

  const loadHistory = async () => {
    if (!tgId) return;
    try {
      const res = await fetch(`/api/tickets/history?telegramId=${tgId}`);
      const data = await res.json();
      if (data.tickets) setHistory(data.tickets);
    } catch (err) { console.error(err); }
  };

  const loadChatMessages = async (ticketId: string) => {
    try {
      const res = await fetch(`/api/tickets/messages?ticketId=${ticketId}`);
      const data = await res.json();
      if (data.messages) setChatMessages(data.messages);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (activeTab === "history") loadHistory(); }, [activeTab, tgId]);

  useEffect(() => {
    if (!selectedTicket) return;
    loadChatMessages(selectedTicket.id);
    const interval = setInterval(() => loadChatMessages(selectedTicket.id), 3000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!tgId || !message.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tickets/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ telegramId: tgId, category, message }) });
      const data = await res.json();
      if (data.success) { setMessage(""); loadHistory(); setActiveTab("history"); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedTicket || !chatText.trim()) return;
    const textToSend = chatText; setChatText("");
    try {
      await fetch("/api/tickets/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId: selectedTicket.id, sender: "user", text: textToSend }) });
      loadChatMessages(selectedTicket.id);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0e10] text-zinc-300 p-4 font-mono overflow-y-auto">
      {userProfile && (
        <div className="flex items-center gap-3 border border-zinc-800 bg-zinc-900/30 p-3 mb-4 rounded-sm">
          {userProfile.photo_url ? (
            <img src={userProfile.photo_url} alt="Avatar" className="w-10 h-10 rounded-full border border-amber-500/40 object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-amber-500 font-bold text-sm uppercase">{userProfile.first_name.slice(0, 2)}</div>
          )}
          <div className="flex flex-col text-left">
            <span className="text-xs font-black text-zinc-100 uppercase tracking-wide">{userProfile.first_name} {userProfile.last_name || ""}</span>
            <span className="text-[10px] text-amber-500/80 font-bold">{userProfile.username ? `@${userProfile.username}` : `ID: ${userProfile.id}`}</span>
          </div>
          <div className="ml-auto text-right"><span className="text-[8px] bg-zinc-800 text-zinc-500 border border-zinc-700/50 px-1.5 py-0.5 uppercase block">// CLIENT_ACCOUNT</span></div>
        </div>
      )}

      {selectedTicket ? (
        <div className="flex flex-col h-[calc(100vh-140px)] border border-zinc-800 bg-zinc-950/60 p-2 relative rounded-sm">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-2">
            <button onClick={() => setSelectedTicket(null)} className="text-amber-500 text-xs font-bold bg-transparent border-none cursor-pointer">[ ← К СПИСКУ ]</button>
            <span className="text-[9px] text-zinc-500 uppercase">СЕССИЯ #{selectedTicket.id.slice(-6)}</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 p-2 text-xs">
            <div className="bg-zinc-900/40 p-2 border border-zinc-800 text-zinc-400 border-l-2 border-l-amber-500 mb-3"><span className="text-[8px] block text-zinc-600 uppercase">// ТЕКСТ ВАШЕГО ЗАПРОСА:</span>{selectedTicket.message}</div>
            {chatMessages.map((msg: any) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`p-2 max-w-[85%] rounded-sm ${msg.sender === "user" ? "bg-amber-500 text-black font-semibold" : "bg-zinc-900 text-zinc-200 border border-zinc-800"}`}>{msg.message}</div>
                <span className="text-[7px] text-zinc-600 uppercase mt-0.5 tracking-widest">{msg.sender}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendChatMessage} className="flex gap-2 border-t border-zinc-800 pt-2 mt-2">
            <input type="text" value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Введите сообщение..." className="flex-1 bg-zinc-900 border border-zinc-800 p-2 text-xs text-white focus:outline-none focus:border-amber-500 rounded-sm" />
            <button type="submit" className="bg-amber-500 text-black font-black text-xs px-4 border-none rounded-sm cursor-pointer">ОТПРАВИТЬ</button>
          </form>
        </div>
      ) : (
        <>
          <div className="flex border border-zinc-800 bg-zinc-900/40 backdrop-blur mb-4 p-1 rounded-sm">
            <button onClick={() => setActiveTab("create")} className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-black transition-all border-none cursor-pointer ${activeTab === "create" ? "bg-amber-500 text-black" : "text-zinc-500"}`}>[ СОЗДАТЬ ЗАПРОС ]</button>
            <button onClick={() => setActiveTab("history")} className={`flex-1 py-3 text-center text-xs uppercase tracking-wider font-black transition-all border-none cursor-pointer ${activeTab === "history" ? "bg-amber-500 text-black" : "text-zinc-500"}`}>[ ИСТОРИЯ ({history.length}) ]</button>
          </div>
          {activeTab === "create" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">// КАТЕГОРИЯ</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 rounded-sm cursor-pointer">
                  <option value="general">ОБЩИЕ ВОПРОСЫ</option><option value="order">ПРОБЛЕМА С ЗАКАЗОМ</option><option value="delivery">ДОСТАВКА И ЛОГИСТИКА</option><option value="return">ОБМЕН И ВОЗВРАТ</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-zinc-500 font-bold mb-1">// ОПИШИТЕ ПРОБЛЕМУ</label>
                <textarea required rows={6} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Введите текст вашего обращения..." className="w-full bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none rounded-sm" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-transparent border-2 border-amber-500 text-amber-500 font-black py-4 uppercase tracking-widest text-xs rounded-sm cursor-pointer">{loading ? "⚡ СИНХРОНИЗАЦИЯ..." : "⚙️ ОТПРАВИТЬ ОБРАЩЕНИЕ"}</button>
            </form>
          ) : (
            <div className="space-y-3">
              {history.length === 0 ? ( <div className="border border-dashed border-zinc-800 p-8 text-center text-zinc-600 text-xs uppercase tracking-wider">// У вас нет открытых сессий.</div> ) : (
                history.map((ticket: any) => (
                  <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="bg-zinc-900/20 border border-zinc-800 p-3 space-y-2 relative overflow-hidden rounded-sm border-l-2 border-l-amber-500 cursor-pointer hover:border-zinc-700 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] uppercase font-bold text-zinc-400 bg-zinc-900 px-1.5 border border-zinc-800">{ticket.category}</span>
                      <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border rounded-sm bg-amber-950/40 text-amber-400 border-amber-500/20">{ticket.status === "open" ? "ОТКРЫТЬ ЧАТ ●" : "РЕШЕНО"}</span>
                    </div>
                    <p className="text-xs text-zinc-300 truncate pr-2">{ticket.message}</p>
                    <div className="text-[8px] text-zinc-600 text-right uppercase pt-1 border-t border-zinc-900/50">{new Date(ticket.createdAt).toLocaleString("ru-RU")}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
