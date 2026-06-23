import Link from "next/link";

const socialLinks = [
  { name: "Instagram", url: "https://instagram.com/souldawn" },
  { name: "TikTok", url: "#" },
  { name: "Telegram", url: "https://t.me/souldawn_support" },
  { name: "Поддержка 24/7", url: "https://t.me/souldawn_support_bot" },
];

const shopLinks = [
  { href: "/collection", label: "Каталог" },
  { href: "/lookbook", label: "Lookbook" },
  { href: "/cart", label: "Корзина" },
  { href: "/profile", label: "Личный кабинет" },
];

const brandLinks = [
  { href: "/about", label: "О бренде" },
  { href: "/contact", label: "Контакты" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-12">
          {/* Brand */}
          <div className="col-span-2">
            <span className="font-display text-2xl font-black tracking-superwide uppercase">
              <span className="text-text">SOUL</span>
              <span className="text-gradient">DAWN</span>
            </span>
            <p className="mt-4 text-sm text-muted leading-relaxed max-w-xs">
              Твоя одежда — это отражение твоей внутренней борьбы. Рождён на улицах, закалён в битвах.
            </p>
            <div className="mt-6 flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-[8px] font-black text-accent">SD</span>
              </div>
              <span className="text-[10px] text-muted/60 tracking-wider uppercase">
                STREETWEAR · С 2024
              </span>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-muted mb-4">
              Магазин
            </h4>
            <ul className="space-y-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-dim hover:text-accent transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Brand nav */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-muted mb-4">
              Бренд
            </h4>
            <ul className="space-y-3">
              {brandLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-text-dim hover:text-accent transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-muted mb-4">
              Связь
            </h4>
            <ul className="space-y-3">
              {socialLinks.map((social) => (
                <li key={social.name}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-text-dim hover:text-accent transition-colors duration-300"
                  >
                    {social.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted">
            © 2026 SOULDAWN. Все права защищены.
          </p>
          <p className="text-xs text-muted tracking-wider">
            БОРЬБА · АУТЕНТИЧНОСТЬ · РАССВЕТ
          </p>
        </div>
      </div>
    </footer>
  );
}
