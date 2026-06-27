"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import type { Look } from "@/lib/lookbook";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";

export default function LookbookGallery({ looks }: { looks: Look[] }) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-24"
      variants={staggerContainer(0.14)}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      {looks.map((look, i) => (
        <motion.div key={look.slug} variants={fadeUp} className={i % 3 === 0 ? "md:col-span-2" : ""}>
          <Link href={`/lookbook/${look.slug}`} className="group block">
            <div
              className={`relative ${i % 3 === 0 ? "aspect-[16/9]" : "aspect-[4/5]"} overflow-hidden`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${look.gradient} transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]`}
              />
              {look.image && (
                <Image
                  src={look.image}
                  alt={look.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 640px"
                  className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
                />
              )}
              {/* grid overlay */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `linear-gradient(${look.accent}22 1px, transparent 1px), linear-gradient(90deg, ${look.accent}22 1px, transparent 1px)`,
                  backgroundSize: "44px 44px",
                }}
              />
              {/* index */}
              <div className="absolute top-6 right-7 opacity-10 group-hover:opacity-25 transition-opacity duration-500">
                <span className="text-6xl md:text-7xl font-black" style={{ color: look.accent }}>
                  0{i + 1}
                </span>
              </div>
              {/* content */}
              <div className="absolute inset-0 flex flex-col justify-end p-7 md:p-10">
                <span
                  className="text-[10px] font-black tracking-[0.25em] uppercase mb-2"
                  style={{ color: look.accent }}
                >
                  {look.subtitle}
                </span>
                <h3 className="text-3xl md:text-5xl font-black tracking-tight uppercase text-text">
                  {look.title}
                </h3>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs font-bold tracking-widest uppercase text-muted group-hover:text-text transition-colors">
                    Смотреть look
                  </span>
                  <span
                    className="h-[2px] w-8 group-hover:w-16 transition-all duration-500"
                    style={{ backgroundColor: look.accent }}
                  />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}
