"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TelegramLogin from "@/components/TelegramLogin";

interface TgSession {
  id: string;
  rawData: string;
  authDate: number;
  hash: string;
  createdAt: string;
  user: { id: string; username: string; fullName: string; telegramId: number | null };
}

interface UserRow {
  id: string;
  telegramId: number | null;
  email: string | null;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  identities: { provider: string; providerUid: string; createdAt: string }[];
  _count: { orders: number; tgSessions: number };
}

interface Template {
  id: string;
  type: string;
  name: string;
  bodyTemplate: string;
  hasPhoto: boolean;
  photoUrl: string;
  hasVideo: boolean;
  videoUrl: string;
}

interface BroadcastRow {
  id: string;
  templateType: string;
  title: string;
  body: string;
  sentCount: number;
  status: string;
  createdAt: string;
}

type Tab = "orders" | "users" | "sessions" | "tg-broadcast" | "in-app" | "products" | "notifications";

interface NotifRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdBy: string | null;
  createdAt: string;
}

interface NotifStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
}

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  price: number;
  oldPrice: number | null;
  category: string;
  gender: string;
  collection: string;
  description: string;
  fullDescription: string;
  details: string;
  material: string;
  care: string;
  sizes: string;
  images: string;
  stock: number;
  badge: string;
  gradient: string;
  pattern: string;
  icon: string;
  tag: string;
  active: boolean;
  createdAt: string;
}

interface OrderRow {
  id: string;
  cipher: string;
  userEmail: string;
  userTelegram: string;
  userName: string;
  userPhone: string;
  itemNames: string;
  itemsCount: number;
  subtotal: number;
  deliveryCost: number;
  discountAmount: number;
  promoCode: string;
  total: number;
  deliveryType: string;
  deliveryCity: string;
  deliveryAddress: string;
  pvzAddress: string;
  comment: string;
  status: string;
  trackingCode: string;
  paidAt: string | null;
  createdAt: string;
}

// Template field configs
const TEMPLATE_FIELDS: Record<string, { label: string; placeholder: string; key: string }[]> = {
  drop: [
    { label: "Название товара", placeholder: "Король ринга", key: "title" },
    { label: "Описание", placeholder: "Оверсайз футболка с принтом на спине. Хлопок 220г/м².", key: "description" },
    { label: "Цена", placeholder: "2 990 ₽", key: "price" },
    { label: "Ссылка", placeholder: "https://souldawn.com/collection", key: "link" },
  ],
  promo: [
    { label: "Промокод", placeholder: "DAWN10", key: "code" },
    { label: "Описание", placeholder: "Скидка 10% на первую покупку", key: "description" },
    { label: "Действует до", placeholder: "31.12.2025", key: "expiry" },
    { label: "Ссылка", placeholder: "https://souldawn.com/collection", key: "link" },
  ],
  news: [
    { label: "Заголовок", placeholder: "SOULDAWN на выставке", key: "title" },
    { label: "Текст", placeholder: "Мы участвуем в выставке спортивной одежды...", key: "text" },
  ],
  restock: [
    { label: "Товар", placeholder: "Король ринга (Чёрный, L)", key: "product" },
    { label: "Описание", placeholder: "Вернулись размеры M и XL", key: "description" },
    { label: "Размеры в наличии", placeholder: "S, M, L, XL", key: "sizes" },
    { label: "Ссылка", placeholder: "https://souldawn.com/collection", key: "link" },
  ],
};

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sessions, setSessions] = useState<TgSession[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // TG Broadcast
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("drop");
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [tgPhotoUrl, setTgPhotoUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  // In-app broadcast
  const [bcTitle, setBcTitle] = useState("");
  const [bcBody, setBcBody] = useState("");
  const [bcResult, setBcResult] = useState("");
  const [bcSending, setBcSending] = useState(false);

  // Broadcasts history
  const [broadcasts, setBroadcasts] = useState<BroadcastRow[]>([]);

  // Products
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [productForm, setProductForm] = useState<Record<string, string | number | null>>({});
  const [productSaving, setProductSaving] = useState(false);
  const [productError, setProductError] = useState("");

  // Notifications
  const [notifs, setNotifs] = useState<NotifRow[]>([]);
  const [notifStats, setNotifStats] = useState<NotifStats>({ total: 0, unread: 0, byType: {} });
  const [editingNotif, setEditingNotif] = useState<NotifRow | null>(null);
  const [notifFilter, setNotifFilter] = useState<string>("");
  const [notifSaving, setNotifSaving] = useState(false);

  // If authenticated and is admin, stay on page. If authenticated but not admin, go to dashboard.
  useEffect(() => {
    if (!loading && user && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [loading, user, isAdmin, router]);

  // Load data based on tab
  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    const signal = controller.signal;

    queueMicrotask(() => setLoadingData(true));

    const promises: Promise<void>[] = [];

    if (tab === "orders") {
      promises.push(
        fetch("/api/admin/orders", { signal })
          .then((r) => r.json())
          .then((d) => setOrders(d.orders || []))
          .catch(() => {})
      );
    }
    if (tab === "users") {
      promises.push(
        fetch("/api/admin/users", { signal })
          .then((r) => r.json())
          .then((d) => setUsers(d.users || []))
          .catch(() => {})
      );
    }
    if (tab === "sessions") {
      promises.push(
        fetch("/api/admin/sessions")
          .then((r) => r.json())
          .then((d) => setSessions(d.sessions || []))
          .catch(() => {})
      );
    }
    if (tab === "tg-broadcast" || tab === "in-app") {
      promises.push(
        fetch("/api/admin/templates")
          .then((r) => r.json())
          .then((d) => setTemplates(d.templates || []))
          .catch(() => {}),
        fetch("/api/admin/broadcast")
          .then((r) => r.json())
          .then((d) => setBroadcasts(d.broadcasts || []))
          .catch(() => {})
      );
    }
    if (tab === "products") {
      promises.push(
        fetch("/api/admin/products", { signal })
          .then((r) => r.json())
          .then((d) => setProducts(d.products || []))
          .catch(() => {})
      );
    }
    if (tab === "notifications") {
      const q = notifFilter ? `?type=${encodeURIComponent(notifFilter)}` : "";
      promises.push(
        fetch(`/api/admin/notifications${q}`, { signal })
          .then((r) => r.json())
          .then((d) => {
            setNotifs(d.notifications || []);
            setNotifStats(d.stats || { total: 0, unread: 0, byType: {} });
          })
          .catch(() => {})
      );
    }

    Promise.all(promises).finally(() => {
      if (!signal.aborted) setLoadingData(false);
    });
    return () => controller.abort();
  }, [isAdmin, tab]);

  // When template changes, reset vars and load preview
  useEffect(() => {
    const vars: Record<string, string> = {};
    const fields = TEMPLATE_FIELDS[selectedTemplate] || [];
    fields.forEach((f) => (vars[f.key] = ""));
    queueMicrotask(() => {
      setTemplateVars(vars);
      setTgPhotoUrl("");
      setPreview("");
      setSendResult("");
    });
  }, [selectedTemplate]);

  const handlePreview = async () => {
    setPreview("Загрузка...");
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: selectedTemplate,
          vars: templateVars,
          photoUrl: tgPhotoUrl,
          previewOnly: true,
        }),
      });
      const data = await res.json();
      setPreview(data.preview || "Ошибка");
    } catch {
      setPreview("Ошибка загрузки превью");
    }
  };

  const handleTgSend = async () => {
    setSending(true);
    setSendResult("");
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType: selectedTemplate,
          vars: templateVars,
          photoUrl: tgPhotoUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendResult(`✅ Telegram: ${data.telegram.sent} отправлено, ${data.telegram.failed} ошибок. Сайт: ${data.inApp}. Всего: ${data.total}`);
        // Reload broadcasts
        fetch("/api/admin/broadcast").then((r) => r.json()).then((d) => setBroadcasts(d.broadcasts || [])).catch(() => {});
      } else {
        setSendResult(`❌ ${data.error}`);
      }
    } catch {
      setSendResult("❌ Ошибка отправки");
    }
    setSending(false);
  };

  const handleInAppSend = async () => {
    if (!bcTitle || !bcBody) return;
    setBcSending(true);
    setBcResult("");
    try {
      const res = await fetch("/api/admin/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: bcTitle, body: bcBody, type: "broadcast", targetAll: true }),
      });
      const data = await res.json();
      setBcResult(data.success ? `✅ Отправлено: ${data.sent} пользователей` : data.error);
      if (data.success) { setBcTitle(""); setBcBody(""); }
    } catch {
      setBcResult("❌ Ошибка отправки");
    }
    setBcSending(false);
  };

  // Show login form for unauthenticated users
  if (loading) {
    return (
      <div className="pt-24 pb-20 min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[rgba(200,200,210,0.2)] border-t-[#C8C8D0] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="pt-24 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#C8C8D0] mb-3">Панель управления</p>
        <h1 className="font-[family-name:var(--font-oswald)] text-3xl md:text-5xl font-black tracking-tight uppercase text-[#E8E8F0] mb-8">
          Админ
        </h1>
        <p className="text-sm text-[#6B6B78] mb-8 text-center max-w-sm">
          Войдите через Telegram, чтобы получить доступ к панели администратора.
        </p>
        <TelegramLogin className="mb-6" />
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-xs font-bold tracking-widest uppercase px-8 py-3 border border-[rgba(200,200,210,0.14)] text-[#6B6B78] hover:border-[rgba(200,200,210,0.3)] hover:text-[#C8C8D0] transition-colors duration-300"
        >
          На главную
        </button>
      </div>
    );
  }

  const handleOrderUpdate = async (id: string, status: string) => {
    try {
      await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      // Reload orders
      const res = await fetch("/api/admin/orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      // silent
    }
  };

  const currentFields = TEMPLATE_FIELDS[selectedTemplate] || [];

  const handleProductSave = async () => {
    if (!productForm.slug || !productForm.name || !productForm.price) {
      setProductError("Slug, название и цена обязательны");
      return;
    }
    setProductSaving(true);
    setProductError("");
    try {
      const isEdit = editingProduct && editingProduct.id;
      const url = isEdit ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products";
      const method = isEdit ? "PATCH" : "POST";

      const body = {
        ...productForm,
        sizes: typeof productForm.sizes === "string" ? productForm.sizes.split(",").map((s: string) => s.trim()).filter(Boolean) : productForm.sizes,
        images: typeof productForm.images === "string" ? productForm.images.split(",").map((s: string) => s.trim()).filter(Boolean) : productForm.images,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setEditingProduct(null);
        setProductForm({});
        // Reload products
        fetch("/api/admin/products").then((r) => r.json()).then((d) => setProducts(d.products || [])).catch(() => {});
      } else {
        setProductError(data.error || "Ошибка сохранения");
      }
    } catch {
      setProductError("Ошибка сети");
    }
    setProductSaving(false);
  };

  const handleProductDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      fetch("/api/admin/products").then((r) => r.json()).then((d) => setProducts(d.products || [])).catch(() => {});
    } catch { /* silent */ }
  };

  const handleNotifDelete = async (id: string) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const q = notifFilter ? `?type=${encodeURIComponent(notifFilter)}` : "";
      fetch(`/api/admin/notifications${q}`).then((r) => r.json()).then((d) => {
        setNotifs(d.notifications || []);
        setNotifStats(d.stats || { total: 0, unread: 0, byType: {} });
      }).catch(() => {});
    } catch { /* silent */ }
  };

  const handleNotifBulkDelete = async (action: string) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [action]: true }),
      });
      const q = notifFilter ? `?type=${encodeURIComponent(notifFilter)}` : "";
      fetch(`/api/admin/notifications${q}`).then((r) => r.json()).then((d) => {
        setNotifs(d.notifications || []);
        setNotifStats(d.stats || { total: 0, unread: 0, byType: {} });
      }).catch(() => {});
    } catch { /* silent */ }
  };

  const handleNotifEditSave = async () => {
    if (!editingNotif) return;
    setNotifSaving(true);
    try {
      await fetch(`/api/admin/notifications/${editingNotif.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editingNotif.title,
          body: editingNotif.body,
          type: editingNotif.type,
          isRead: editingNotif.isRead,
        }),
      });
      setEditingNotif(null);
      const q = notifFilter ? `?type=${encodeURIComponent(notifFilter)}` : "";
      fetch(`/api/admin/notifications${q}`).then((r) => r.json()).then((d) => {
        setNotifs(d.notifications || []);
        setNotifStats(d.stats || { total: 0, unread: 0, byType: {} });
      }).catch(() => {});
    } catch { /* silent */ }
    setNotifSaving(false);
  };

  const handleNotifToggleRead = async (id: string, currentRead: boolean) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: !currentRead }),
      });
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: !currentRead } : n)));
      setNotifStats((prev) => ({
        ...prev,
        unread: currentRead ? prev.unread + 1 : Math.max(0, prev.unread - 1),
      }));
    } catch { /* silent */ }
  };

  return (
    <div className="pt-24 pb-20 px-6 md:px-12 lg:px-24 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#C8C8D0] mb-3">Панель управления</p>
          <h1 className="font-[family-name:var(--font-oswald)] text-3xl md:text-5xl font-black tracking-tight uppercase text-[#E8E8F0]">
            Админ
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-[rgba(200,200,210,0.1)] overflow-x-auto">
          {([
            { key: "orders", label: "Заказы" },
            { key: "products", label: "Товары" },
            { key: "notifications", label: "Уведомления" },
            { key: "tg-broadcast", label: "TG Рассылка" },
            { key: "in-app", label: "Сайт уведомления" },
            { key: "users", label: "Пользователи" },
            { key: "sessions", label: "TG Sessions" },
          ] as { key: string; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              className={`px-5 py-3 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t.key
                  ? "text-[#C8C8D0] border-[#C8C8D0]"
                  : "text-[#6B6B78] border-transparent hover:text-[#E8E8F0]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loadingData && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[rgba(200,200,210,0.2)] border-t-[#C8C8D0] rounded-full animate-spin" />
          </div>
        )}

        {/* ═══ Orders Tab ═══ */}
        {tab === "orders" && !loadingData && (
          <div>
            {orders.length === 0 ? (
              <p className="text-center text-[#6B6B78] py-16">Заказов пока нет</p>
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto">
                {orders.map((o) => (
                  <details key={o.id} className="border border-[rgba(200,200,210,0.08)] bg-[#101014]/30 group">
                    <summary className="px-5 py-4 cursor-pointer hover:bg-[rgba(200,200,210,0.02)] transition-colors flex items-center gap-4 text-xs">
                      <span className="font-black text-[#C8C8D0] font-[family-name:var(--font-oswald)] tracking-wider text-sm">
                        {o.cipher}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        o.status === "pending" ? "text-amber-400/80 bg-amber-400/10" :
                        o.status === "paid" ? "text-emerald-400/80 bg-emerald-400/10" :
                        o.status === "shipped" ? "text-blue-400/80 bg-blue-400/10" :
                        o.status === "delivered" ? "text-[#C8C8D0]/80 bg-[rgba(200,200,210,0.1)]" :
                        o.status === "cancelled" ? "text-red-400/80 bg-red-400/10" :
                        "text-[#6B6B78]"
                      }`}>
                        {o.status === "pending" ? "Ожидает" : o.status === "paid" ? "Оплачен" : o.status === "processing" ? "В обработке" : o.status === "shipped" ? "Отправлен" : o.status === "delivered" ? "Доставлен" : o.status === "cancelled" ? "Отменён" : o.status}
                      </span>
                      <span className="text-[#E8E8F0] font-bold">{o.total.toLocaleString("ru-RU")} ₽</span>
                      <span className="text-[#6B6B78]/50 hidden sm:inline">{o.itemNames.slice(0, 40)}{o.itemNames.length > 40 ? "..." : ""}</span>
                      <span className="text-[#6B6B78]/40 ml-auto shrink-0">{new Date(o.createdAt).toLocaleString("ru-RU")}</span>
                    </summary>
                    <div className="px-5 pb-4 border-t border-[rgba(200,200,210,0.05)] pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mb-4">
                        <div>
                          <span className="text-[#6B6B78]/50 block mb-0.5">Клиент</span>
                          <p className="text-[#E8E8F0]">{o.userName || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[#6B6B78]/50 block mb-0.5">Email</span>
                          <p className="text-[#E8E8F0] break-all">{o.userEmail}</p>
                        </div>
                        <div>
                          <span className="text-[#6B6B78]/50 block mb-0.5">Telegram</span>
                          <p className="text-[#E8E8F0]">{o.userTelegram}</p>
                        </div>
                        {o.userPhone && (
                          <div>
                            <span className="text-[#6B6B78]/50 block mb-0.5">Телефон</span>
                            <p className="text-[#E8E8F0]">{o.userPhone}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-[#6B6B78]/50 block mb-0.5">Доставка</span>
                          <p className="text-[#E8E8F0]">
                            {o.deliveryType === "cdek-pvz" ? "ПВЗ СДЭК" : o.deliveryType === "cdek-courier" ? "Курьер СДЭК" : "Почта России"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#6B6B78]/50 block mb-0.5">Адрес</span>
                          <p className="text-[#E8E8F0] break-all">{o.pvzAddress || o.deliveryAddress || "—"}</p>
                        </div>
                        {o.deliveryCity && (
                          <div>
                            <span className="text-[#6B6B78]/50 block mb-0.5">Город</span>
                            <p className="text-[#E8E8F0]">{o.deliveryCity}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-[#6B6B78]/50 mb-4">
                        <span>Товаров: {o.itemsCount}</span>
                        <span className="mx-2">·</span>
                        <span>Подитог: {o.subtotal.toLocaleString("ru-RU")} ₽</span>
                        {o.deliveryCost > 0 && <><span className="mx-2">·</span><span>Доставка: {o.deliveryCost.toLocaleString("ru-RU")} ₽</span></>}
                        {o.discountAmount > 0 && <><span className="mx-2">·</span><span className="text-emerald-400/70">Скидка: −{o.discountAmount.toLocaleString("ru-RU")} ₽</span></>}
                        {o.promoCode && <><span className="mx-2">·</span><span>Промо: {o.promoCode}</span></>}
                      </div>
                      {o.comment && (
                        <div className="text-xs text-[#6B6B78]/40 mb-4">
                          <span className="text-[#6B6B78]/50">Комментарий:</span> {o.comment}
                        </div>
                      )}
                      {o.trackingCode && (
                        <div className="flex items-center gap-2 text-xs mb-4">
                          <span className="text-[#6B6B78]/50">Трек-код:</span>
                          <span className="font-bold text-[#C8C8D0]">{o.trackingCode}</span>
                        </div>
                      )}
                      {/* Admin actions */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-[rgba(200,200,210,0.06)]">
                        {o.status === "pending" && (
                          <button
                            onClick={() => handleOrderUpdate(o.id, "paid")}
                            className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors"
                          >
                            Отметить оплачен
                          </button>
                        )}
                        {o.status === "paid" && (
                          <button
                            onClick={() => handleOrderUpdate(o.id, "processing")}
                            className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase bg-[rgba(200,200,210,0.1)] text-[#C8C8D0] hover:bg-[rgba(200,200,210,0.2)] transition-colors"
                          >
                            В обработку
                          </button>
                        )}
                        {(o.status === "processing" || o.status === "paid") && (
                          <button
                            onClick={() => handleOrderUpdate(o.id, "shipped")}
                            className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase bg-blue-400/10 text-blue-400 hover:bg-blue-400/20 transition-colors"
                          >
                            Отправлен
                          </button>
                        )}
                        {o.status === "shipped" && (
                          <button
                            onClick={() => handleOrderUpdate(o.id, "delivered")}
                            className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase bg-[rgba(200,200,210,0.1)] text-[#C8C8D0] hover:bg-[rgba(200,200,210,0.2)] transition-colors"
                          >
                            Доставлен
                          </button>
                        )}
                        {o.status !== "cancelled" && o.status !== "delivered" && (
                          <button
                            onClick={() => handleOrderUpdate(o.id, "cancelled")}
                            className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                          >
                            Отменить
                          </button>
                        )}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ TG Broadcast Tab ═══ */}
        {tab === "tg-broadcast" && !loadingData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Template Form */}
            <div className="space-y-5">
              <h2 className="text-sm font-bold text-[#E8E8F0] mb-1">Шаблон рассылки</h2>

              <div>
                <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/60 block mb-2">Тип</label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.type}
                      onClick={() => setSelectedTemplate(t.type)}
                      className={`px-4 py-2 text-[10px] font-bold tracking-wider uppercase rounded-sm border transition-all duration-200 ${
                        selectedTemplate === t.type
                          ? "bg-[#C8C8D0] text-[#08080A] border-[#C8C8D0]"
                          : "border-[rgba(200,200,210,0.14)] text-[#6B6B78] hover:border-[rgba(200,200,210,0.3)] hover:text-[#E8E8F0]"
                      }`}
                    >
                      {t.name}
                      {t.hasVideo && " 🎬"}
                      {t.hasPhoto && !t.hasVideo && " 📷"}
                    </button>
                  ))}
                </div>
              </div>

              {currentFields.map((f) => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/60 block mb-2">
                    {f.label}
                  </label>
                  {f.key.includes("description") || f.key === "text" ? (
                    <textarea
                      value={templateVars[f.key] || ""}
                      onChange={(e) => setTemplateVars({ ...templateVars, [f.key]: e.target.value })}
                      rows={3}
                      className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-4 py-3 text-sm text-[#E8E8F0] placeholder:text-[#6B6B78]/40 focus:outline-none focus:border-[rgba(200,200,210,0.3)] transition-colors resize-none"
                      placeholder={f.placeholder}
                    />
                  ) : (
                    <input
                      type="text"
                      value={templateVars[f.key] || ""}
                      onChange={(e) => setTemplateVars({ ...templateVars, [f.key]: e.target.value })}
                      className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-4 py-3 text-sm text-[#E8E8F0] placeholder:text-[#6B6B78]/40 focus:outline-none focus:border-[rgba(200,200,210,0.3)] transition-colors"
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}

              {/* Video banner indicator */}
              {templates.find((t) => t.type === selectedTemplate)?.hasVideo && (
                <div className="flex items-center gap-3 px-4 py-3 bg-[#101014] border border-[rgba(200,200,210,0.08)] rounded-sm">
                  <div className="w-8 h-8 rounded-sm bg-[#1a1a1e] flex items-center justify-center text-sm">🎬</div>
                  <div>
                    <p className="text-[10px] font-bold text-[#E8E8F0] uppercase tracking-wider">Видео-баннер</p>
                    <p className="text-[9px] text-[#6B6B78]/50 mt-0.5">Живой баннер SOULDAWN будет отправлен с видео</p>
                  </div>
                </div>
              )}

              {/* Photo URL (only for non-video templates) */}
              {templates.find((t) => t.type === selectedTemplate)?.hasPhoto && !templates.find((t) => t.type === selectedTemplate)?.hasVideo && (
                <div>
                  <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/60 block mb-2">
                    Фото (URL)
                  </label>
                  <input
                    type="text"
                    value={tgPhotoUrl}
                    onChange={(e) => setTgPhotoUrl(e.target.value)}
                    className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-4 py-3 text-sm text-[#E8E8F0] placeholder:text-[#6B6B78]/40 focus:outline-none focus:border-[rgba(200,200,210,0.3)] transition-colors"
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePreview}
                  className="flex-1 py-3 text-[10px] font-bold tracking-[0.12em] uppercase border border-[rgba(200,200,210,0.14)] text-[#6B6B78] hover:text-[#E8E8F0] hover:border-[rgba(200,200,210,0.3)] transition-colors duration-300"
                >
                  Превью
                </button>
                <button
                  onClick={handleTgSend}
                  disabled={sending}
                  className="flex-1 py-3 text-[11px] font-black tracking-[0.12em] uppercase bg-[#C8C8D0] text-[#08080A] hover:bg-[#E8E8F0] transition-colors duration-300 disabled:opacity-40"
                >
                  {sending ? "Отправка..." : "📤 Отправить в TG + Сайт"}
                </button>
              </div>
              {sendResult && <p className="text-xs text-[#C8C8D0] mt-3 whitespace-pre-wrap">{sendResult}</p>}
            </div>

            {/* Preview + History */}
            <div className="space-y-6">
              {/* Live Preview */}
              <div>
                <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/60 mb-3">Превью сообщения</h3>

                {/* Video banner preview */}
                {templates.find((t) => t.type === selectedTemplate)?.hasVideo && (
                  <div className="mb-4 bg-[#101014] border border-[rgba(200,200,210,0.08)] rounded-sm overflow-hidden">
                    <video
                      src={templates.find((t) => t.type === selectedTemplate)?.videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full aspect-video object-cover"
                    />
                    <div className="px-4 py-2 flex items-center gap-2">
                      <span className="text-[9px] text-[#6B6B78]/50 uppercase tracking-wider">🎬 Видео-баннер</span>
                      <span className="text-[9px] text-[#6B6B78]/30">•</span>
                      <span className="text-[9px] text-[#6B6B78]/50">Отправится в TG вместе с сообщением</span>
                    </div>
                  </div>
                )}

                <div className="bg-[#101014] border border-[rgba(200,200,210,0.08)] p-5 rounded-sm min-h-[120px]">
                  {preview ? (
                    <pre className="text-xs text-[#E8E8F0]/80 whitespace-pre-wrap font-mono leading-relaxed">{preview}</pre>
                  ) : (
                    <p className="text-xs text-[#6B6B78]/40 italic">Заполните поля и нажмите «Превью»</p>
                  )}
                </div>
              </div>

              {/* History */}
              {broadcasts.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/60 mb-3">История рассылок</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {broadcasts.map((b) => (
                      <div key={b.id} className="border border-[rgba(200,200,210,0.06)] bg-[#101014]/30 px-4 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[#E8E8F0] uppercase">{b.templateType}</span>
                          <span className="text-[9px] text-[#6B6B78]/50">{new Date(b.createdAt).toLocaleString("ru-RU")}</span>
                        </div>
                        <p className="text-[11px] text-[#6B6B78] line-clamp-1">{b.title}</p>
                        <p className="text-[9px] text-[#6B6B78]/40 mt-1">Отправлено: {b.sentCount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ In-App Notifications Tab ═══ */}
        {tab === "in-app" && !loadingData && (
          <div className="max-w-lg space-y-5">
            <p className="text-sm text-[#6B6B78]">Уведомления появятся в колокольчике на сайте.</p>
            <div>
              <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/60 block mb-2">Заголовок</label>
              <input
                type="text"
                value={bcTitle}
                onChange={(e) => setBcTitle(e.target.value)}
                className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-4 py-3 text-sm text-[#E8E8F0] placeholder:text-[#6B6B78]/40 focus:outline-none focus:border-[rgba(200,200,210,0.3)] transition-colors"
                placeholder="Новый дроп!"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#6B6B78]/60 block mb-2">Текст</label>
              <textarea
                value={bcBody}
                onChange={(e) => setBcBody(e.target.value)}
                rows={4}
                className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-4 py-3 text-sm text-[#E8E8F0] placeholder:text-[#6B6B78]/40 focus:outline-none focus:border-[rgba(200,200,210,0.3)] transition-colors resize-none"
                placeholder="Коллекция доступна..."
              />
            </div>
            <button
              onClick={handleInAppSend}
              disabled={bcSending || !bcTitle || !bcBody}
              className="w-full py-3.5 text-[11px] font-black tracking-[0.15em] uppercase bg-[#C8C8D0] text-[#08080A] hover:bg-[#E8E8F0] transition-colors duration-300 disabled:opacity-40"
            >
              {bcSending ? "Отправка..." : "Отправить всем"}
            </button>
            {bcResult && <p className="text-xs text-[#C8C8D0]">{bcResult}</p>}
          </div>
        )}

        {/* ═══ Users Tab ═══ */}
        {tab === "users" && !loadingData && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#6B6B78] border-b border-[rgba(200,200,210,0.1)]">
                  <th className="pb-3 pr-4 font-bold">Пользователь</th>
                  <th className="pb-3 pr-4 font-bold">TG ID</th>
                  <th className="pb-3 pr-4 font-bold">Email</th>
                  <th className="pb-3 pr-4 font-bold">Роль</th>
                  <th className="pb-3 pr-4 font-bold">Заказы</th>
                  <th className="pb-3 pr-4 font-bold">TG сессий</th>
                  <th className="pb-3 font-bold">Последний вход</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[rgba(200,200,210,0.05)] text-[#E8E8F0]/80">
                    <td className="py-3 pr-4">
                      <p className="font-bold text-[#E8E8F0]">{u.fullName || u.username || "—"}</p>
                      <p className="text-[#6B6B78]">{u.username && u.fullName ? `@${u.username}` : ""}</p>
                    </td>
                    <td className="py-3 pr-4 text-[#6B6B78]">{u.telegramId || "—"}</td>
                    <td className="py-3 pr-4 text-[#6B6B78]">{u.email || "—"}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${u.role === "admin" ? "bg-[rgba(200,200,210,0.15)] text-[#C8C8D0]" : "text-[#6B6B78]"}`}>{u.role}</span>
                    </td>
                    <td className="py-3 pr-4 text-[#6B6B78]">{u._count.orders}</td>
                    <td className="py-3 pr-4 text-[#6B6B78]">{u._count.tgSessions}</td>
                    <td className="py-3 text-[#6B6B78]">{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("ru-RU") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-center text-[#6B6B78] py-12">Нет пользователей</p>}
          </div>
        )}

        {/* ═══ TG Sessions Tab ═══ */}
        {tab === "sessions" && !loadingData && (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {sessions.map((s) => (
              <details key={s.id} className="border border-[rgba(200,200,210,0.08)] bg-[#101014]/50">
                <summary className="px-4 py-3 cursor-pointer text-xs hover:bg-[rgba(200,200,210,0.03)] transition-colors flex items-center gap-3">
                  <span className="font-bold text-[#E8E8F0]">{s.user.fullName || s.user.username || "—"}</span>
                  <span className="text-[#6B6B78]">@{s.user.username || "?"}</span>
                  <span className="text-[#6B6B78]/50 ml-auto">{new Date(s.createdAt).toLocaleString("ru-RU")}</span>
                </summary>
                <div className="px-4 pb-3 border-t border-[rgba(200,200,210,0.05)]">
                  <p className="text-[10px] font-bold text-[#6B6B78] mb-1 mt-2">Полные tdata:</p>
                  <pre className="text-[10px] text-[#6B6B78]/70 bg-black/30 p-3 overflow-x-auto max-h-48 overflow-y-auto font-mono leading-relaxed whitespace-pre-wrap break-all">{s.rawData}</pre>
                </div>
              </details>
            ))}
            {sessions.length === 0 && <p className="text-center text-[#6B6B78] py-12">Нет TG сессий</p>}
          </div>
        )}

        {/* ═══ Products Tab ═══ */}
        {tab === "products" && !loadingData && (
          <div>
            {/* Product Form (create / edit) */}
            {editingProduct !== null ? (
              <div className="max-w-2xl space-y-4 mb-8 border border-[rgba(200,200,210,0.12)] bg-[#101014]/50 p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-[#E8E8F0]">
                    {editingProduct ? `Редактирование: ${editingProduct.name}` : "Новый товар"}
                  </h2>
                  <button
                    onClick={() => { setEditingProduct(null); setProductForm({}); setProductError(""); }}
                    className="text-[10px] font-bold tracking-wider uppercase text-[#6B6B78] hover:text-[#E8E8F0] transition-colors"
                  >
                    ✕ Отмена
                  </button>
                </div>
                {productError && <p className="text-xs text-red-400/80">{productError}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Slug *</label>
                    <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.slug || ""} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} placeholder="product-slug" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Название *</label>
                    <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.name || ""} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Название товара" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Цена (копейки) *</label>
                    <input type="number" className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.price || ""} onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })} placeholder="299000" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Старая цена (копейки)</label>
                    <input type="number" className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.oldPrice || ""} onChange={(e) => setProductForm({ ...productForm, oldPrice: e.target.value ? Number(e.target.value) : null })} placeholder="Пусто = нет скидки" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Категория</label>
                    <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.category || ""} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} placeholder="Верх" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Пол</label>
                    <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.gender || ""} onChange={(e) => setProductForm({ ...productForm, gender: e.target.value })} placeholder="Унисекс" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Коллекция</label>
                    <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.collection || ""} onChange={(e) => setProductForm({ ...productForm, collection: e.target.value })} placeholder="ANGELvsDEMON" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Stock</label>
                    <input type="number" className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.stock || ""} onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })} placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Badge</label>
                    <select className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.badge || ""} onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}>
                      <option value="">—</option>
                      <option value="NEW">NEW</option>
                      <option value="HIT">HIT</option>
                      <option value="SALE">SALE</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Tag</label>
                    <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.tag || ""} onChange={(e) => setProductForm({ ...productForm, tag: e.target.value })} placeholder="Новинка" />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Короткое описание</label>
                  <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={productForm.description || ""} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Описание товара" />
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Полное описание</label>
                  <textarea rows={3} className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)] resize-none" value={productForm.fullDescription || ""} onChange={(e) => setProductForm({ ...productForm, fullDescription: e.target.value })} placeholder="Подробное описание..." />
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Размеры (через запятую)</label>
                  <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={typeof productForm.sizes === "string" ? productForm.sizes : ""} onChange={(e) => setProductForm({ ...productForm, sizes: e.target.value })} placeholder="S, M, L, XL" />
                </div>
                <div>
                  <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Images (через запятую)</label>
                  <input className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]" value={typeof productForm.images === "string" ? productForm.images : ""} onChange={(e) => setProductForm({ ...productForm, images: e.target.value })} placeholder="/products/img1.jpg, /products/img2.jpg" />
                </div>
                <button
                  onClick={handleProductSave}
                  disabled={productSaving}
                  className="w-full py-3 text-[11px] font-black tracking-[0.15em] uppercase bg-[#C8C8D0] text-[#08080A] hover:bg-[#E8E8F0] transition-colors disabled:opacity-40"
                >
                  {productSaving ? "Сохранение..." : "💾 Сохранить"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingProduct({} as ProductRow);
                  setProductForm({ slug: "", name: "", price: "", category: "Верх", gender: "Унисекс", stock: "0", badge: "", tag: "", sizes: "", images: "", description: "", fullDescription: "", collection: "", oldPrice: null });
                }}
                className="mb-6 px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] uppercase bg-[#C8C8D0] text-[#08080A] hover:bg-[#E8E8F0] transition-colors"
              >
                + Добавить товар
              </button>
            )}

            {/* Product List */}
            {products.length === 0 ? (
              <p className="text-center text-[#6B6B78] py-16">Нет товаров</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((p) => {
                  const priceRub = Math.floor(p.price / 100);
                  const img = (() => { try { return JSON.parse(p.images || "[]"); } catch { return []; } })()[0];
                  return (
                    <div key={p.id} className={`border bg-[#101014]/30 p-4 ${!p.active ? "border-red-400/20 opacity-60" : "border-[rgba(200,200,210,0.08)]"}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#E8E8F0] truncate">{p.name}</p>
                          <p className="text-[10px] text-[#6B6B78] mt-0.5">{p.category} · {p.stock} шт</p>
                        </div>
                        {p.badge && (
                          <span className={`ml-2 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                            p.badge === "NEW" ? "bg-[rgba(200,200,210,0.15)] text-[#C8C8D0]" :
                            p.badge === "HIT" ? "bg-emerald-400/10 text-emerald-400/70" :
                            "bg-red-400/10 text-red-400/70"
                          }`}>{p.badge}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#C8C8D0]">{priceRub.toLocaleString("ru-RU")} ₽</p>
                        {!p.active && <span className="text-[9px] text-red-400/60 uppercase tracking-wider">Скрыт</span>}
                      </div>
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[rgba(200,200,210,0.06)]">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            const { active: _a, createdAt: _c, ...rest } = p;
                            setProductForm({
                              ...rest,
                              sizes: (() => { try { return JSON.parse(p.sizes).join(", "); } catch { return p.sizes; } })(),
                              images: (() => { try { return JSON.parse(p.images).join(", "); } catch { return p.images; } })(),
                              details: p.details,
                            });
                          }}
                          className="flex-1 py-1.5 text-[9px] font-bold tracking-wider uppercase border border-[rgba(200,200,210,0.14)] text-[#6B6B78] hover:text-[#E8E8F0] hover:border-[rgba(200,200,210,0.3)] transition-colors"
                        >
                          ✏️ Редактировать
                        </button>
                        <button
                          onClick={() => handleProductDelete(p.id)}
                          className="py-1.5 px-3 text-[9px] font-bold tracking-wider uppercase text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          {p.active ? "🗑" : "♻️"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ Notifications Tab ═══ */}
        {tab === "notifications" && !loadingData && (
          <div>
            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex gap-3">
                <span className="text-xs text-[#6B6B78]">
                  Всего: <span className="text-[#E8E8F0] font-bold">{notifStats.total}</span>
                </span>
                <span className="text-xs text-[#6B6B78]">
                  Непрочитанных: <span className="text-amber-400/80 font-bold">{notifStats.unread}</span>
                </span>
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => handleNotifBulkDelete("deleteRead")}
                  className="px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase border border-[rgba(200,200,210,0.14)] text-[#6B6B78] hover:text-[#E8E8F0] hover:border-[rgba(200,200,210,0.3)] transition-colors"
                >
                  Удалить прочитанные
                </button>
                <button
                  onClick={() => handleNotifBulkDelete("deleteAll")}
                  className="px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  Удалить все
                </button>
              </div>
            </div>

            {/* Type filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setNotifFilter("")}
                className={`px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase border transition-colors ${
                  !notifFilter
                    ? "border-[#C8C8D0] text-[#C8C8D0] bg-[#C8C8D0]/10"
                    : "border-[rgba(200,200,210,0.14)] text-[#6B6B78] hover:border-[rgba(200,200,210,0.3)]"
                }`}
              >
                Все
              </button>
              {Object.entries(notifStats.byType).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setNotifFilter(notifFilter === type ? "" : type)}
                  className={`px-3 py-1.5 text-[9px] font-bold tracking-wider uppercase border transition-colors ${
                    notifFilter === type
                      ? "border-[#C8C8D0] text-[#C8C8D0] bg-[#C8C8D0]/10"
                      : "border-[rgba(200,200,210,0.14)] text-[#6B6B78] hover:border-[rgba(200,200,210,0.3)]"
                  }`}
                >
                  {type} ({count})
                </button>
              ))}
            </div>

            {/* Editing modal */}
            {editingNotif && (
              <div className="max-w-2xl mb-6 border border-[rgba(200,200,210,0.12)] bg-[#101014]/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-[#E8E8F0]">Редактирование уведомления</h2>
                  <button
                    onClick={() => setEditingNotif(null)}
                    className="text-[10px] font-bold tracking-wider uppercase text-[#6B6B78] hover:text-[#E8E8F0] transition-colors"
                  >
                    ✕ Отмена
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Заголовок</label>
                    <input
                      className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]"
                      value={editingNotif.title}
                      onChange={(e) => setEditingNotif({ ...editingNotif, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Текст</label>
                    <textarea
                      rows={3}
                      className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)] resize-none"
                      value={editingNotif.body}
                      onChange={(e) => setEditingNotif({ ...editingNotif, body: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Тип</label>
                      <select
                        className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]"
                        value={editingNotif.type}
                        onChange={(e) => setEditingNotif({ ...editingNotif, type: e.target.value })}
                      >
                        <option value="info">info</option>
                        <option value="broadcast">broadcast</option>
                        <option value="welcome">welcome</option>
                        <option value="promo">promo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#6B6B78]/60 block mb-1">Прочитано</label>
                      <select
                        className="w-full bg-[#101014] border border-[rgba(200,200,210,0.14)] px-3 py-2 text-sm text-[#E8E8F0] focus:outline-none focus:border-[rgba(200,200,210,0.3)]"
                        value={editingNotif.isRead ? "true" : "false"}
                        onChange={(e) => setEditingNotif({ ...editingNotif, isRead: e.target.value === "true" })}
                      >
                        <option value="false">Нет</option>
                        <option value="true">Да</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleNotifEditSave}
                    disabled={notifSaving}
                    className="w-full py-3 text-[11px] font-black tracking-[0.15em] uppercase bg-[#C8C8D0] text-[#08080A] hover:bg-[#E8E8F0] transition-colors disabled:opacity-40"
                  >
                    {notifSaving ? "Сохранение..." : "💾 Сохранить"}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications list */}
            {notifs.length === 0 ? (
              <p className="text-center text-[#6B6B78] py-16">Нет уведомлений</p>
            ) : (
              <div className="space-y-2 max-h-[700px] overflow-y-auto">
                {notifs.map((n) => (
                  <div
                    key={n.id}
                    className={`border px-5 py-4 ${
                      !n.isRead
                        ? "border-[rgba(200,200,210,0.12)] bg-[rgba(200,200,210,0.03)]"
                        : "border-[rgba(200,200,210,0.06)] bg-[#101014]/30"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-xs font-bold ${!n.isRead ? "text-[#E8E8F0]" : "text-[#E8E8F0]/60"}`}>
                            {n.title}
                          </p>
                          {!n.isRead && (
                            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400/70 bg-amber-400/10">
                              Новое
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#6B6B78]/50 bg-[rgba(200,200,210,0.06)]">
                            {n.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B6B78] line-clamp-2 mb-1">{n.body}</p>
                        <div className="flex items-center gap-3 text-[9px] text-[#6B6B78]/40">
                          <span>{n.userName}</span>
                          {n.userEmail && <span>{n.userEmail}</span>}
                          <span className="ml-auto">{new Date(n.createdAt).toLocaleString("ru-RU")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleNotifToggleRead(n.id, n.isRead)}
                          className="p-1.5 text-[#6B6B78]/40 hover:text-[#C8C8D0] transition-colors"
                          title={n.isRead ? "Пометить непрочитанным" : "Пометить прочитанным"}
                        >
                          {n.isRead ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="10" /></svg>
                          )}
                        </button>
                        <button
                          onClick={() => setEditingNotif(n)}
                          className="p-1.5 text-[#6B6B78]/40 hover:text-[#C8C8D0] transition-colors"
                          title="Редактировать"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleNotifDelete(n.id)}
                          className="p-1.5 text-[#6B6B78]/40 hover:text-red-400/70 transition-colors"
                          title="Удалить"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}