"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TelegramLogin from "@/components/TelegramLogin";
import SocialLogins from "@/components/SocialLogins";
import ScrollReveal from "@/components/ScrollReveal";

type AuthTab = "login" | "register";

function AuthForm() {
  const { loginWithEmail, register } = useAuth();
  const [tab, setTab] = useState<AuthTab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result =
        tab === "login"
          ? await loginWithEmail(email, password)
          : await register(email, password, username || undefined);
      if (result.error) setError(result.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-sm w-full">
      <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-accent"
        >
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight uppercase mb-2 text-center">
        {tab === "login" ? "Войти" : "Регистрация"}
      </h1>
      <p className="text-sm text-muted mb-8 text-center">
        {tab === "login"
          ? "Войдите через email или Telegram"
          : "Создайте аккаунт SOULDAWN"}
      </p>

      {/* Tab switcher */}
      <div className="flex w-full mb-6 border border-line rounded-lg overflow-hidden">
        <button
          onClick={() => { setTab("login"); setError(""); }}
          className={`flex-1 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors ${
            tab === "login" ? "bg-accent text-bg" : "text-muted hover:text-text"
          }`}
        >
          Войти
        </button>
        <button
          onClick={() => { setTab("register"); setError(""); }}
          className={`flex-1 py-2.5 text-xs font-bold tracking-wider uppercase transition-colors ${
            tab === "register" ? "bg-accent text-bg" : "text-muted hover:text-text"
          }`}
        >
          Регистрация
        </button>
      </div>

      {/* Email/password form */}
      <form onSubmit={handleSubmit} className="w-full space-y-3 mb-6">
        {tab === "register" && (
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Имя (необязательно)"
            className="w-full bg-surface border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full bg-surface border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={tab === "register" ? "Пароль (мин. 8 символов)" : "Пароль"}
          required
          className="w-full bg-surface border border-white/10 px-4 py-3 text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-accent/40 transition-colors"
        />
        {error && (
          <p className="text-xs text-accent-red text-center">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading
            ? "..."
            : tab === "login"
            ? "Войти"
            : "Создать аккаунт"}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 w-full mb-6">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-[10px] text-muted uppercase tracking-widest">или</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Telegram login */}
      <TelegramLogin />

      {/* Apple / VK */}
      <div className="w-full mt-4">
        <SocialLogins />
      </div>

      <Link href="/" className="btn-outline mt-6 text-xs">
        Назад на главную
      </Link>
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // /profile — только точка входа. Авторизованных отправляем в личный кабинет.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-12 h-12 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-6" />
        <p className="text-sm text-muted">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-20 min-h-screen flex flex-col items-center justify-center px-6">
      <ScrollReveal>
        <AuthForm />
      </ScrollReveal>
    </div>
  );
}
