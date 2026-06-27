import type { Metadata } from "next";
import { LOOKS } from "@/lib/lookbook";
import LookbookGallery from "@/components/LookbookGallery";

export const metadata: Metadata = {
  title: "Lookbook — SOULDAWN",
  description: "Курированные образы SOULDAWN: total looks и истории за ними.",
};

export default function LookbookPage() {
  return (
    <main className="min-h-screen bg-bg pt-28 md:pt-32">
      <div className="max-w-7xl mx-auto px-6">
        <header className="mb-14 md:mb-20">
          <p className="text-xs font-bold tracking-superwide uppercase text-accent mb-4">
            Коллекция 2026
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none">
            Look<span className="text-gradient">book</span>
          </h1>
          <p className="mt-6 max-w-xl text-sm md:text-base text-muted leading-relaxed">
            Не просто одежда — законченные образы. Каждый look — это настроение,
            история и готовый сет вещей.
          </p>
        </header>

        <LookbookGallery looks={LOOKS} />
      </div>
    </main>
  );
}
