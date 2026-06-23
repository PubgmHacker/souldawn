/**
 * SOULDAWN — Lookbook data.
 * Each look is a curated "total look" with a short story and the pieces that
 * compose it. Used by /lookbook (gallery) and /lookbook/[slug] (detail).
 */
export interface LookItem {
  name: string;
  category: string;
  price: number; // rubles
}

export interface Look {
  slug: string;
  title: string;
  subtitle: string;
  story: string;
  accent: string;
  gradient: string; // tailwind gradient classes (fallback под фото)
  image?: string; // реальное фото образа (из /public/lookbook)
  items: LookItem[];
}

export const LOOKS: Look[] = [
  {
    slug: "concrete-jungle",
    title: "CONCRETE JUNGLE",
    subtitle: "Худи × Карго",
    story:
      "Город не прощает слабости. Этот образ — броня для тех, кто живёт на улицах и не скрывается в толпе. Плотные ткани, функциональные детали, максимальная свобода движения.",
    accent: "#C97B3D",
    gradient: "from-[#1a1510] via-surface to-[#0a0a0a]",
    image: "/lookbook/5314688838582086474.jpg",
    items: [
      { name: "VOID HOODIE", category: "Hoodies", price: 8990 },
      { name: "TACTICAL FIT", category: "Pants", price: 11990 },
      { name: "BEANIE SD", category: "Accessories", price: 2990 },
    ],
  },
  {
    slug: "night-shift",
    title: "NIGHT SHIFT",
    subtitle: "Лонгслив × Джоггеры",
    story:
      "Когда город засыпает — мы тренируемся. Лёгкий, дышащий слой для ночных сессий и поздних выходов. Тишина, фокус, движение.",
    accent: "#D4915C",
    gradient: "from-[#10141a] via-surface to-[#0a0a0a]",
    items: [
      { name: "STATIC", category: "T-Shirts", price: 4490 },
      { name: "DRIP PANTS", category: "Pants", price: 9490 },
    ],
  },
  {
    slug: "dawn-break",
    title: "DAWN BREAK",
    subtitle: "Бомбер × Штаны",
    story:
      "Рассвет принадлежит тем, кто не спал. Финальный образ коллекции — о победе над собой и новом дне, который ты заслужил.",
    accent: "#D4945A",
    gradient: "from-[#1a1610] via-surface to-[#0a0a0a]",
    items: [
      { name: "ERROR 404", category: "T-Shirts", price: 4990 },
      { name: "CROSSBODY BAG", category: "Accessories", price: 6490 },
    ],
  },
];

export function getLook(slug: string): Look | undefined {
  return LOOKS.find((l) => l.slug === slug);
}
