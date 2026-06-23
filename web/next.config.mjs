/** @type {next.NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // Разрешаем Telegram открывать страницы админки и поддержки во фреймах Mini App
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
