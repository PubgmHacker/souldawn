/** @type {next.NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  // Игнорируем ошибки ESLint и TypeScript во время сборки на Railway
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        // Разрешаем Telegram встраивать страницы админки и поддержки во фреймы
        source: "/(admin|support)(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors https://*.telegram.org https://telegram.org http://localhost:*;"
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
