"use client";

import { useEffect, useState, useCallback } from "react";

interface Link {
  id: string;
  key: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

export default function AdminLinks() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/links", { credentials: "include" });
      if (!r.ok) throw new Error("Нет доступа или ошибка загрузки");
      const data = await r.json();
      setLinks(Array.isArray(data.links) ? data.links : []);
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

  const patch = (id: string, patch: Partial<Link>) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const save = async (l: Link) => {
    setSavingId(l.id);
    try {
      const r = await fetch(`/api/admin/links/${l.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: l.label, url: l.url, isActive: l.isActive, sortOrder: l.sortOrder }),
      });
      if (!r.ok) throw new Error();
    } catch {
      alert("Не удалось сохранить");
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (l: Link) => {
    if (!confirm(`Удалить ссылку «${l.label}»?`)) return;
    const r = await fetch(`/api/admin/links/${l.id}`, { method: "DELETE", credentials: "include" });
    if (r.ok) await load();
    else alert("Не удалось удалить");
  };

  const add = async () => {
    if (!newLabel.trim()) return;
    const r = await fetch("/api/admin/links", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), url: newUrl.trim(), sortOrder: links.length }),
    });
    if (r.ok) {
      setNewLabel("");
      setNewUrl("");
      await load();
    } else {
      const d = await r.json().catch(() => ({}));
      alert(d.error || "Не удалось добавить");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-2">Настройки</p>
        <h1 className="text-3xl font-black tracking-tight uppercase">Ссылки и контакты</h1>
        <p className="text-sm text-muted mt-2">Редактируйте ссылки футера сайта и мини-аппа. Каждая — в своём поле.</p>
      </div>

      {error && <div className="mb-4 text-sm text-accent-red">{error}</div>}

      {loading ? (
        <div className="p-12 text-center text-muted text-sm">Загрузка…</div>
      ) : (
        <div className="space-y-3">
          {links.map((l) => (
            <div key={l.id} className="flex flex-wrap items-end gap-3 border border-white/5 bg-surface/30 p-4">
              <label className="flex-1 min-w-[140px]">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">Название</span>
                <input
                  className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
                  value={l.label}
                  onChange={(e) => patch(l.id, { label: e.target.value })}
                />
              </label>
              <label className="flex-[2] min-w-[200px]">
                <span className="text-[9px] font-bold tracking-widest uppercase text-muted block mb-1">URL</span>
                <input
                  className="w-full bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
                  value={l.url}
                  onChange={(e) => patch(l.id, { url: e.target.value })}
                  placeholder="https://…"
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-muted h-[38px]">
                <input type="checkbox" checked={l.isActive} onChange={(e) => patch(l.id, { isActive: e.target.checked })} />
                Активна
              </label>
              <button
                onClick={() => save(l)}
                disabled={savingId === l.id}
                className="text-[10px] font-black uppercase px-4 py-2 bg-accent text-bg hover:bg-white disabled:opacity-50"
              >
                {savingId === l.id ? "…" : "Сохранить"}
              </button>
              <button
                onClick={() => remove(l)}
                className="text-[10px] font-bold uppercase px-3 py-2 border border-white/10 text-accent-red hover:border-accent-red/40"
              >
                Удалить
              </button>
            </div>
          ))}
          {links.length === 0 && <div className="p-8 text-center text-muted text-sm">Ссылок пока нет</div>}
        </div>
      )}

      {/* Добавить новую */}
      <div className="mt-8 border border-accent/15 bg-surface/30 p-4">
        <span className="text-[10px] font-bold tracking-widest uppercase text-accent block mb-3">Добавить ссылку</span>
        <div className="flex flex-wrap items-end gap-3">
          <input
            className="flex-1 min-w-[140px] bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
            placeholder="Название (напр. Оферта)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <input
            className="flex-[2] min-w-[200px] bg-dark border border-white/10 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent/40"
            placeholder="https://…"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <button onClick={add} className="text-[10px] font-black uppercase px-5 py-2 bg-accent text-bg hover:bg-white">+ Добавить</button>
        </div>
      </div>
    </div>
  );
}
