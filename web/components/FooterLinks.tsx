"use client";

import { useEffect, useState } from "react";

interface ContactLink {
  key: string;
  label: string;
  url: string;
}

// Fallback, пока /api/settings пуст/недоступен.
const FALLBACK: ContactLink[] = [
  { key: "instagram", label: "Instagram", url: "https://instagram.com/souldawn" },
  { key: "telegram", label: "Telegram", url: "https://t.me/souldawn_support" },
  { key: "support", label: "Поддержка 24/7", url: "https://t.me/souldawn_support_bot" },
];

export default function FooterLinks() {
  const [links, setLinks] = useState<ContactLink[]>(FALLBACK);

  useEffect(() => {
    let alive = true;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!alive) return;
        const list: ContactLink[] = Array.isArray(data?.links) ? data.links : [];
        if (list.length) setLinks(list);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ul className="space-y-3">
      {links.map((l) => (
        <li key={l.key}>
          <a
            href={l.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted hover:text-accent transition-colors duration-300"
          >
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
