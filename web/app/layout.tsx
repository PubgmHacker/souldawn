import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
import SupportChat from "@/components/SupportChat";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://souldawn.ru";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SOULDAWN — Одежда для тех, кто борется",
    template: "%s | SOULDAWN",
  },
  description:
    "Спортивная одежда с характером. Уличная культура встречает спорт. Твоя одежда — это отражение твоей внутренней борьбы.",
  keywords: ["SOULDAWN", "streetwear", "спортивная одежда", "уличная мода", "hoodie", "худи"],
  authors: [{ name: "SOULDAWN" }],
  creator: "SOULDAWN",
  // Open Graph
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "SOULDAWN",
    title: "SOULDAWN — Одежда для тех, кто борется",
    description:
      "Спортивная одежда с характером. Уличная культура встречает спорт.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SOULDAWN — Streetwear",
      },
    ],
  },
  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "SOULDAWN — Одежда для тех, кто борется",
    description: "Спортивная одежда с характером. Уличная культура встречает спорт.",
    images: ["/og-image.png"],
  },
  // Favicon
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#C8102E",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-bg text-text antialiased">
        <Providers>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <SupportChat />
        </Providers>
      </body>
    </html>
  );
}
