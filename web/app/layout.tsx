import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import SupportChat from "@/components/SupportChat";
import CustomCursor from "@/components/CustomCursor";
import LenisProvider from "@/components/LenisProvider";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SOULDAWN — Одежда для тех, кто борется",
  description:
    "Спортивная одежда с характером. Уличная культура встречает спорт. Твоя одежда — это отражение твоей внутренней борьбы.",
  keywords: ["SOULDAWN", "спортивная одежда", "streetwear", "MMA", "бокс", "коллекция"],
  openGraph: {
    title: "SOULDAWN — Рассвет после боя",
    description: "Спортивная одежда с характером. Коллекция Ангел vs Демон.",
    siteName: "SOULDAWN",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-bg text-text antialiased">
        <LenisProvider>
          <Providers>
            <CustomCursor />
            <Header />
            <main className="min-h-screen">{children}</main>
            <Footer />
            <SupportChat />
          </Providers>
        </LenisProvider>
      </body>
    </html>
  );
}
