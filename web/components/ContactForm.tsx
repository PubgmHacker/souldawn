"use client";

import { useState } from "react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="space-y-6"
    >
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-muted mb-2">
          Имя
        </label>
        <input
          type="text"
          required
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300"
          placeholder="Ваше имя"
        />
      </div>

      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-muted mb-2">
          Почта
        </label>
        <input
          type="email"
          required
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300"
          placeholder="ваша@почта.com"
        />
      </div>

      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-muted mb-2">
          Сообщение
        </label>
        <textarea
          required
          rows={5}
          className="w-full bg-transparent border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors duration-300 resize-none"
          placeholder="Как мы можем помочь?"
        />
      </div>

      <button type="submit" className="btn-primary w-full md:w-auto">
        {submitted ? "Отправлено ✓" : "Отправить"}
      </button>
    </form>
  );
}
