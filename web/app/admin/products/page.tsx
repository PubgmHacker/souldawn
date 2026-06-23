"use client";

import { useEffect, useState, useCallback } from "react";

interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  fullDescription: string;
  price: string;
  priceKopecks: number;
  oldPriceKopecks: number | null;
  category: string;
  images: string[];
  sizes: string[];
  badge: "NEW" | "HIT" | "SALE" | null;
  stock: number;
  isActive: boolean;
  sortOrder: number;
}

const CATEGORIES = ["Верх", "Низ", "Аксессуары"];
const BADGES: Array<"NEW" | "HIT" | "SALE"> = ["NEW", "HIT", "SALE"];

type Draft = {
  id?: string;
  name: string;
  description: string;
  fullDescription: string;
  priceRub: string;
  oldPriceRub: string;
  category: string;
  sizes: string;
  badge: "" | "NEW" | "HIT" | "SALE";
  stock: string;
  isActive: boolean;
  sortOrder: string;
  images: string[];
};

const EMPTY_DRAFT: Draft = {
  name: "",
  description: "",
  fullDescription: "",
  priceRub: "",
  oldPriceRub: "",
  category: "Верх",
  sizes: "S, M, L, XL",
  badge: "",
  stock: "0",
  isActive: true,
  sortOrder: "0",
  images: [],
};

function toDraft(p: AdminProduct): Draft {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    fullDescription: p.fullDescription,
    priceRub: String(Math.round(p.priceKopecks / 100)),
    oldPriceRub: p.oldPriceKopecks ? String(Math.round(p.oldPriceKopecks / 100)) : "",
    category: p.category || "Верх",
    sizes: (p.sizes || []).join(", "),
    badge: p.badge || "",
    stock: String(p.stock ?? 0),
    isActive: p.isActive,
    sortOrder: String(p.sortOrder ?? 0),
    images: p.images || [],
  };
}

export default function AdminProducts() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/products", { credentials: "include" });
      if (!r.ok) throw new Error("Нет доступа или ошибка загрузки");
      const data = await r.json();
      setItems(Array.isArray(data.products) ? data.products : []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => { setDraft({ ...EMPTY_DRAFT }); setUrlInput(""); };
  const openEdit = (p: AdminProduct) => { setDraft(toDraft(p)); setUrlInput(""); };
  const close = () => setDraft(null);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const payload = {
      name: draft.name.trim(),
      description: draft.description,
      fullDescription: draft.fullDescription,
      priceKopecks: Math.round((parseFloat(draft.priceRub) || 0) * 100),
      oldPriceKopecks: draft.oldPriceRub ? Math.round((parseFloat(draft.oldPriceRub) || 0) * 100) : null,
      category: draft.category,
      sizes: draft.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      badge: draft.badge || null,
      stock: Math.max(0, Math.round(parseInt(draft.stock, 10) || 0)),
      isActive: draft.isActive,
      sortOrder: parseInt(draft.sortOrder, 10) || 0,
      images: draft.images,
    };
    try {
      const url = draft.id ? `/api/admin/products/${draft.id}` : "/api/admin/products";
      const method = draft.id ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Не удалось сохранить");
      }
      close();
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: AdminProduct) => {
    if (!confirm(`Удалить «${p.name}»?`)) return;
    const r = await fetch(`/api/admin/products/${p.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) await load();
    else alert("Не удалось удалить");
  };

  const onUpload = async (file: File) => {
    if (!draft) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/admin/products/upload", { method: "POST", credentials: "include", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Ошибка загрузки");
      setDraft({ ...draft, images: [...draft.images, d.url] });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Ошибка загрузки. Можно вставить URL вручную.");
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    if (!draft || !urlInput.trim()) return;
    setDraft({ ...draft, images: [...draft.images, urlInput.trim()] });
    setUrlInput("");
  };

  const removeImage = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, images: draft.images.filter((_, i) => i !== idx) });
  };

  const moveImage = (idx: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = [...draft.images];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setDraft({ ...draft, images: next });
  };

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-2">Управление</p>
          <h1 className="text-3xl font-black tracking-tight uppercase">Товары</h1>
          <p className="text-sm text-muted mt-2">{items.length} товаров</p>
        </div>
        <button
          onClick={openNew}
          className="text-[11px] font-black tracking-widest uppercase px-5 py-2.5 bg-accent text-bg hover:bg-white transition-colors"
        >
          + Создать
        </button>
      </div>

      {error && <div className="mb-4 text-sm text-accent-red">{error}</div>}
      {loading ? (
        <div className="p-12 text-center text-muted text-sm">Загрузка…</div>
      ) : (
        <div className="border border-white/5 bg-surface/30 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold tracking-widest uppercase text-muted">
                <th className="text-left p-4">Товар</th>
                <th className="text-left p-4">Категория</th>
                <th className="text-right p-4">Цена</th>
                <th className="text-center p-4">Остаток</th>
                <th className="text-center p-4">Бейдж</th>
                <th className="text-center p-4">Активен</th>
                <th className="text-right p-4">Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.name} className="w-10 h-12 object-cover bg-dark" />
                      ) : (
                        <div className="w-10 h-12 bg-white/5" />
                      )}
                      <div>
                        <p className="font-bold text-text">{p.name}</p>
                        <p className="text-[10px] text-muted/50 font-mono">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted">{p.category}</td>
                  <td className="p-4 text-right text-accent font-bold">{p.price}</td>
                  <td className="p-4 text-center">{p.stock}</td>
                  <td className="p-4 text-center">
                    {p.badge && <span className="text-[9px] font-bold tracking-wider px-2 py-0.5 bg-accent/20 text-accent">{p.badge}</span>}
                  </td>
                  <td className="p-4 text-center">{p.isActive ? "✓" : "—"}</td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(p)} className="text-[10px] font-bold uppercase text-accent hover:underline mr-3">Править</button>
                    <button onClick={() => remove(p)} className="text-[10px] font-bold uppercase text-accent-red hover:underline">Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div className="p-12 text-center text-muted text-sm">Товары не найдены</div>}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" onClick={close} />
          <div className="relative w-full max-w-2xl max-h-[88vh] bg-surface border border-white/[0.06] overflow-y-auto p-6">
            <h2 className="text-xl font-black uppercase mb-5">{draft.id ? "Редактирование" : "Новый товар"}</h2>

            <div className="space-y-4">
              <Field label="Название">
                <input className="inp" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </Field>
              <Field label="Описание (короткое)">
                <input className="inp" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
              <Field label="Полное описание">
                <textarea className="inp min-h-[80px]" value={draft.fullDescription} onChange={(e) => setDraft({ ...draft, fullDescription: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Цена, ₽">
                  <input className="inp" type="number" value={draft.priceRub} onChange={(e) => setDraft({ ...draft, priceRub: e.target.value })} />
                </Field>
                <Field label="Старая цена, ₽ (опц.)">
                  <input className="inp" type="number" value={draft.oldPriceRub} onChange={(e) => setDraft({ ...draft, oldPriceRub: e.target.value })} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Категория">
                  <select className="inp" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Бейдж">
                  <select className="inp" value={draft.badge} onChange={(e) => setDraft({ ...draft, badge: e.target.value as Draft["badge"] })}>
                    <option value="">— нет —</option>
                    {BADGES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Остаток">
                  <input className="inp" type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} />
                </Field>
                <Field label="Порядок">
                  <input className="inp" type="number" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
                </Field>
                <Field label="Активен">
                  <label className="flex items-center gap-2 h-[42px] text-sm text-muted">
                    <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
                    В продаже
                  </label>
                </Field>
              </div>

              <Field label="Размеры (через запятую)">
                <input className="inp" value={draft.sizes} onChange={(e) => setDraft({ ...draft, sizes: e.target.value })} />
              </Field>

              {/* Фото */}
              <div>
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-2">Фото (первое — главное)</span>
                <div className="flex flex-wrap gap-3 mb-3">
                  {draft.images.map((src, i) => (
                    <div key={i} className="relative w-20 h-24 border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute top-0 left-0 text-[7px] font-bold bg-accent text-bg px-1">ГЛАВНОЕ</span>}
                      <div className="absolute bottom-0 inset-x-0 flex justify-between bg-bg/70 text-[10px]">
                        <button onClick={() => moveImage(i, -1)} className="px-1 hover:text-accent">←</button>
                        <button onClick={() => removeImage(i)} className="px-1 text-accent-red">✕</button>
                        <button onClick={() => moveImage(i, 1)} className="px-1 hover:text-accent">→</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-[10px] font-bold uppercase tracking-wider px-3 py-2 border border-white/10 cursor-pointer hover:border-accent/40">
                    {uploading ? "Загрузка…" : "Загрузить файл"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ""; }} />
                  </label>
                  <input className="inp flex-1 min-w-[160px]" placeholder="или вставьте URL картинки" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
                  <button onClick={addUrl} className="text-[10px] font-bold uppercase px-3 py-2 border border-white/10 hover:border-accent/40">+ URL</button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={close} className="text-[11px] font-bold uppercase px-5 py-2.5 border border-white/10 text-muted hover:text-text">Отмена</button>
              <button onClick={save} disabled={saving} className="text-[11px] font-black uppercase px-6 py-2.5 bg-accent text-bg hover:bg-white disabled:opacity-50">
                {saving ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .inp {
          width: 100%;
          background: var(--tw-color-dark, #1a1a1a);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 10px 12px;
          font-size: 14px;
          color: inherit;
        }
        .inp:focus { outline: none; border-color: rgba(196, 164, 132, 0.5); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
