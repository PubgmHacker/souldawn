"use client";

import { useState } from "react";
import ScrollReveal from "./ScrollReveal";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <section className="section-padding bg-bg">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="relative border border-white/[0.06] p-8 md:p-16 overflow-hidden">
            {/* Background accent glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent-red/5 rounded-full blur-[100px]" />

            <div className="relative z-10 max-w-xl mx-auto text-center">
              <span className="text-[9px] font-black tracking-[0.25em] uppercase text-accent block mb-4">
                Будь в курсе
              </span>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight uppercase text-text mb-4">
                Подпишись на <span className="text-accent">drops</span>
              </h2>
              <p className="text-sm text-muted/70 mb-8 leading-relaxed">
                Новые коллекции, эксклюзивные товары и скидки первыми.
                Никакого спама — только то, что имеет значение.
              </p>

              {submitted ? (
                <div className="py-4">
                  <p className="text-accent font-bold tracking-wider uppercase text-sm">
                    ✓ Ты подписан!
                  </p>
                  <p className="text-xs text-muted/50 mt-2">
                    Следи за обновлениями в соцсетях
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex gap-0 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="flex-1 px-5 py-3.5 bg-surface border border-white/[0.08] border-r-0 text-sm text-text placeholder:text-muted/40 focus:outline-none focus:border-accent/40 transition-colors duration-300"
                  />
                  <button
                    type="submit"
                    className="px-8 py-3.5 bg-accent text-bg text-[10px] font-black tracking-[0.15em] uppercase hover:bg-white transition-colors duration-300"
                  >
                    Подписаться
                  </button>
                </form>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
