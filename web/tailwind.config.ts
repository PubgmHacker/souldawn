import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:              "#08080A",
        "bg-soft":       "#0C0C0F",
        surface:         "#101014",
        "surface-light": "#16161C",
        "surface-hi":    "#1D1D24",
        text:            "#F2EEE9",
        "text-dim":      "#B7B2AC",
        muted:           "#7C7C85",
        steel:           "#8A8F98",
        accent:          "#E8B87A",
        "accent-warm":   "#D4915C",
        "accent-deep":   "#A86A3D",
        "accent-bright": "#F5D0A3",
        "accent-red":    "#E8B87A",
        "accent-violet": "#E8B87A",
        sand:            "#D4C4A8",
        line:            "rgba(242,238,233,0.08)",
        "line-strong":   "rgba(242,238,233,0.14)",
      },
      fontFamily: {
        sans:    ["var(--font-sans)",    "Inter",         "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Space Grotesk", "Inter",     "sans-serif"],
        mono:    ["var(--font-mono)",    "Space Grotesk", "ui-monospace"],
      },
      boxShadow: {
        glow:        "0 0 60px -24px rgba(232,184,122,0.45)",
        "glow-warm": "0 0 40px -16px rgba(212,145,92,0.35)",
        card:        "0 24px 80px -32px rgba(0,0,0,0.85)",
        ingot:       "inset 0 1px 0 rgba(232,184,122,0.15), 0 24px 80px -32px rgba(0,0,0,0.85)",
      },
      transitionTimingFunction: {
        expo:   "cubic-bezier(0.22, 1, 0.36, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      letterSpacing: {
        ultrawide: "0.25em",
        superwide: "0.4em",
      },
      animation: {
        "spotlight":      "spotlight 2s ease 0.75s 1 forwards",
        "fade-in-up":     "fadeInUp 0.8s ease-out forwards",
        "fade-in":        "fadeIn 1s ease-out forwards",
        "marquee":        "marquee 30s linear infinite",
        "marquee-slow":   "marquee 45s linear infinite",
        "float":          "float 6s ease-in-out infinite",
        "glow":           "glow 4s ease-in-out infinite",
        "shimmer":        "shimmer 6s linear infinite",
        "gradient-shift": "gradientShift 12s ease infinite",
        "dawn-pulse":     "dawnPulse 3s ease-in-out infinite",
      },
      keyframes: {
        spotlight:     { "0%": { opacity: "0", transform: "translate(-72%, -62%) scale(0.5)" }, "100%": { opacity: "1", transform: "translate(-50%,-40%) scale(1)" } },
        fadeInUp:      { "0%": { opacity: "0", transform: "translateY(30px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        fadeIn:        { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        marquee:       { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        float:         { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-12px)" } },
        glow:          { "0%, 100%": { opacity: "0.35", transform: "scale(1)" }, "50%": { opacity: "0.6", transform: "scale(1.08)" } },
        shimmer:       { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        gradientShift: { "0%, 100%": { backgroundPosition: "0% 50%" }, "50%": { backgroundPosition: "100% 50%" } },
        dawnPulse:     { "0%, 100%": { opacity: "0.4", transform: "scale(1)" }, "50%": { opacity: "0.7", transform: "scale(1.04)" } },
      },
      backgroundSize: { "200": "200% 200%" },
    },
  },
  plugins: [],
};
export default config;
