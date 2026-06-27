import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // —— Argus-style premium dark scene ——
        bg: "#070708",
        "bg-soft": "#0B0B0D",
        surface: "#0F0F11",
        "surface-light": "#16161A",
        "surface-hi": "#1E1E24",
        text: "#F2EEE9",
        "text-dim": "#B7B2AC",
        muted: "#797680",
        // Strict black / white / blood-red — борьба, характер, агрессия
        accent: "#C8102E",
        "accent-warm": "#E5E5E5",
        "accent-violet": "#C8102E",
        "accent-deep": "#8B0000",
        "accent-red": "#C8102E",
        sand: "#D4C4A8",
        line: "rgba(255,255,255,0.07)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Space Grotesk", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 60px -24px rgba(200,16,46,0.4)",
        "glow-violet": "0 0 60px -24px rgba(200,16,46,0.4)",
        card: "0 24px 80px -32px rgba(0,0,0,0.8)",
      },
      transitionTimingFunction: {
        expo: "cubic-bezier(0.22, 1, 0.36, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      letterSpacing: {
        ultrawide: "0.25em",
        superwide: "0.4em",
      },
      animation: {
        "spotlight": "spotlight 2s ease 0.75s 1 forwards",
        "fade-in-up": "fadeInUp 0.8s ease-out forwards",
        "fade-in": "fadeIn 1s ease-out forwards",
        "marquee": "marquee 30s linear infinite",
        "marquee-slow": "marquee 45s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 4s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "gradient-shift": "gradientShift 12s ease infinite",
      },
      keyframes: {
        spotlight: {
          "0%": { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: "1", transform: "translate(-50%,-40%) scale(1)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        glow: {
          "0%, 100%": { opacity: "0.35", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.08)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      backgroundSize: {
        "200": "200% 200%",
      },
    },
  },
  plugins: [],
};
export default config;
