"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { href: "/collection", label: "Каталог" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/about", label: "О бренде" },
  { href: "/contact", label: "Контакты" },
  { href: "https://t.me/souldawn_support_bot", label: "Поддержка", external: true },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-bg/80 backdrop-blur-xl border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 md:h-20 flex items-center justify-between">
        {/* Left — Logo */}
        <Link href="/" className="flex items-center gap-2 justify-self-start">
          <span className="text-lg md:text-xl font-black tracking-superwide uppercase text-text">
            SOUL
          </span>
          <span className="text-lg md:text-xl font-black tracking-superwide uppercase text-accent">
            DAWN
          </span>
        </Link>

        {/* Center — Navigation */}
        <nav className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold tracking-widest uppercase text-muted hover:text-accent transition-colors duration-300"
              >
                {link.label} ↗
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-xs font-bold tracking-widest uppercase transition-colors duration-300 ${
                  isActive(link.href) ? "text-accent" : "text-muted hover:text-text"
                }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1.5 left-0 h-[2px] bg-accent transition-all duration-300 ${
                    isActive(link.href) ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            )
          )}
        </nav>

        {/* Right — Cart + Profile + Mobile Toggle */}
        <div className="flex items-center gap-4 justify-self-end">
          {/* Profile icon */}
          {user ? (
            <Link href="/profile" className="relative group" aria-label="Профиль">
              <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent text-xs font-bold group-hover:bg-accent/30 transition-colors duration-300">
                {(user.username || user.name || "S")[0].toUpperCase()}
              </div>
            </Link>
          ) : (
            <Link href="/profile" className="text-xs font-bold tracking-widest uppercase text-muted hover:text-accent transition-colors duration-300">
              Войти
            </Link>
          )}
          {/* Cart icon */}
          <Link href="/cart" className="relative group" aria-label="Корзина">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted group-hover:text-accent transition-colors duration-300"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent text-bg text-[9px] font-black flex items-center justify-center rounded-full animate-fade-in">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex flex-col gap-1.5 w-7"
            aria-label="Меню"
          >
            <span
              className={`block h-0.5 bg-text transition-all duration-300 ${
                mobileOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block h-0.5 bg-text transition-all duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-0.5 bg-text transition-all duration-300 ${
                mobileOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-500 bg-bg/95 backdrop-blur-xl ${
          mobileOpen ? "max-h-96 border-b border-white/5" : "max-h-0"
        }`}
      >
        <nav className="flex flex-col items-center gap-6 py-8">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                className="text-sm font-bold tracking-widest uppercase text-muted hover:text-accent transition-colors duration-300"
              >
                {link.label} ↗
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-sm font-bold tracking-widest uppercase transition-colors duration-300 ${
                  isActive(link.href) ? "text-accent" : "text-muted hover:text-text"
                }`}
              >
                {link.label}
              </Link>
            )
          )}
          <Link
            href="/cart"
            onClick={() => setMobileOpen(false)}
            className="text-sm font-bold tracking-widest uppercase text-accent transition-colors duration-300"
          >
            Корзина {totalItems > 0 && `(${totalItems})`}
          </Link>
        </nav>
      </div>
    </header>
  );
}
