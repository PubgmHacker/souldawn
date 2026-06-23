"use client";

import { motion } from "framer-motion";
import { staggerContainer, fadeUp, viewportOnce } from "@/lib/motion";
import ContactForm from "@/components/ContactForm";

const socials = [
  { name: "Instagram", handle: "@souldawn" },
  { name: "TikTok", handle: "@souldawn" },
  { name: "Telegram", handle: "@souldawn" },
];

export default function ContactPage() {
  return (
    <div className="pt-28 pb-20 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          variants={staggerContainer(0.12)}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-bold tracking-superwide uppercase text-accent mb-4"
          >
            Контакты
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="font-display text-4xl md:text-6xl font-black tracking-tight uppercase"
          >
            Свяжитесь <span className="text-gradient">с нами</span>
          </motion.h1>
        </motion.div>

        <motion.div
          className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-16"
          variants={staggerContainer(0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {/* Form */}
          <motion.div variants={fadeUp}>
            <ContactForm />
          </motion.div>

          {/* Info */}
          <motion.div variants={fadeUp}>
            <div className="space-y-10">
              {/* Socials */}
              <div>
                <h3 className="text-xs font-bold tracking-widest uppercase text-accent mb-6">
                  Мы в соцсетях
                </h3>
                <div className="space-y-4">
                  {socials.map((s) => (
                    <div key={s.name} className="flex items-center gap-4">
                      <span className="text-sm font-bold tracking-wider uppercase text-text w-24">
                        {s.name}
                      </span>
                      <span className="text-sm text-muted">{s.handle}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-xs font-bold tracking-widest uppercase text-accent mb-4">
                  Студия
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  Где-то между бетоном и рассветом<br />
                  Подземелье, уровень B2<br />
                  Город, который не спит
                </p>
              </div>

              {/* Email */}
              <div>
                <h3 className="text-xs font-bold tracking-widest uppercase text-accent mb-4">
                  Почта
                </h3>
                <a
                  href="mailto:hello@souldawn.com"
                  className="text-sm text-muted hover:text-accent transition-colors duration-300"
                >
                  hello@souldawn.com
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
