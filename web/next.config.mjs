/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  images: {
    // Убран unoptimized:true — теперь Next.js оптимизирует изображения
    remotePatterns: [
      // Telegram CDN (аватары, фото из Telegram Login Widget)
      {
        protocol: "https",
        hostname: "t.me",
      },
      {
        protocol: "https",
        hostname: "cdn4.telegram.org",
      },
      {
        protocol: "https",
        hostname: "cdn5.telegram.org",
      },
      // Telegram user photos (t.me/i/userpic/...)
      {
        protocol: "https",
        hostname: "*.telegram.org",
      },
    ],
    // Форматы для современных браузеров
    formats: ["image/avif", "image/webp"],
  },
};
export default nextConfig;
