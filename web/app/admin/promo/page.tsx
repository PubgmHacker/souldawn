"use client";

import { useEffect, useState, useCallback } from "react";

interface Promo {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  usageLimit: number;
  usedCount: number;
  expiresAt: string | null;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function AdminPromo() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");
  const [newLimit, setNewLimit] = useState("0");
  const [newExpires, setNewExpires] = useState("");
  const [addError, setAddError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/promo", { credentials: "include" });
      if (!r.ok) throw new Error("Нет доступа или ошибка загрузки");
      const data = await r.json();
      setPromos(Array.isArray(data.promos) ? data.promos : []);
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

  const patch = (id: string, p: Partial<Promo>) => {
    setPromos((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  };

  const save = async (p: Promo) => {
    setSavingId(p.id);
    try {
      const r = await fetch(`/api/admin/promo/${p.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: p.code,
          discountPercent: p.discountPercent,
          isActive: p.isActive,
          usageLimit: p.usageLimit,
          expiresAt: p.expiresAt || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Ошибка");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (p: Promo) => {
    if (!confirm(`Удалить промокод «${p.code}»?`)) return;
    const r = await fetch(`/api/admin/promo/${p.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) await load();
    else alert("Не удалось удалить");
  };

  const add = async () => {
    setAddError("");
    if (!newCode.trim()) {
      setAddError("Укажите код");
      return;
    }
    const r = await fetch("/api/admin/promo", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: newCode.trim(),
        discountPercent: Number(newPercent) || 0,
        usageLimit: Number(newLimit) || 0,
        expiresAt: newExpires || null,
      }),
    });
    if (r.ok) {
      setNewCode("");
      setNewPercent("10");
      setNewLimit("0");
      setNewExpires("");
      await load();
    } else {
      const d = await r.json().catch(() => ({}));
      setAddError(d.error || "Не удалось добавить");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-2">Маркетинг</p>
        <h1 className="text-3xl font-black tracking-tight uppercase">Промокоды</h1>
        <p className="text-sm text-muted mt-2">Создавайте и редактируйте промокоды. Скидка применяется в корзине и при оплате.</p>
      </div>

      {error && <div className="mb-4 text-sm text-accent-red">{error}</div>}

      {/* Создание */}
      <div className="mb-8 border border-accent/15 bg-surface/30 p-4">
        <span className="text-[10px] font-bold tracking-widest uppercase text-accent block mb-3">Новый промокод</span>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[140px]">
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">Код</span>
            <input
              className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text uppercase focus:outline-none focus:border-accent/40"
              placeholder="SALE20"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            />
          </label>
          <label className="w-[110px]">
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">Скидка %</span>
            <input
              type="number" min={1} max={100}
              className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
            />
          </label>
          <label className="w-[130px]">
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">Лимит (0=∞)</span>
            <input
              type="number" min={0}
              className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
            />
          </label>
          <label className="w-[160px]">
            <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">Действует до</span>
            <input
              type="date"
              className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
              value={newExpires}
              onChange={(e) => setNewExpires(e.target.value)}
            />
          </label>
          <button onClick={add} className="text-[10px] font-black uppercase px-5 py-2 bg-accent text-bg hover:bg-white">+ Создать</button>
        </div>
        {addError && <p className="text-accent-red text-[11px] mt-2">{addError}</p>}
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted text-sm">Загрузка…</div>
      ) : (
        <div className="space-y-3">
          {promos.map((p) => (
            <div key={p.id} className="flex flex-wrap items-end gap-3 border border-white/5 bg-surface/30 p-4">
              <label className="min-w-[130px]">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">Код</span>
                <input
                  className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text uppercase focus:outline-none focus:border-accent/40"
                  value={p.code}
                  onChange={(e) => patch(p.id, { code: e.target.value.toUpperCase() })}
                />
              </label>
              <label className="w-[90px]">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">Скидка %</span>
                <input
                  type="number" min={1} max={100}
                  className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
                  value={p.discountPercent}
                  onChange={(e) => patch(p.id, { discountPercent: Number(e.target.value) })}
                />
              </label>
              <label className="w-[110px]">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">Лимит</span>
                <input
                  type="number" min={0}
                  className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
                  value={p.usageLimit}
                  onChange={(e) => patch(p.id, { usageLimit: Number(e.target.value) })}
                />
              </label>
              <label className="w-[150px]">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">До</span>
                <input
                  type="date"
                  className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
                  value={toDateInput(p.expiresAt)}
                  onChange={(e) => patch(p.id, { expiresAt: e.target.value || null })}
                />
              </label>
              <div className="text-[10px] text-muted h-[38px] flex items-center">Исп.: {p.usedCount}</div>
              <label className="flex items-center gap-2 text-sm text-muted h-[38px]">
                <input type="checkbox" checked={p.isActive} onChange={(e) => patch(p.id, { isActive: e.target.checked })} />
                Активен
              </label>
              <button
                onClick={() => save(p)}
                disabled={savingId === p.id}
                className="text-[10px] font-black uppercase px-4 py-2 bg-accent text-bg hover:bg-white disabled:opacity-50"
              >
                {savingId === p.id ? "…" : "Сохранить"}
              </button>
              <button
                onClick={() => remove(p)}
                className="text-[10px] font-bold uppercase px-3 py-2 border border-white/10 text-accent-red hover:border-accent-red/40"
              >
                Удалить
              </button>
            </div>
          ))}
          {promos.length === 0 && <div className="p-8 text-center text-muted text-sm">Промокодов пока нет</div>}
        </div>
      )}
    </div>
  );
}
