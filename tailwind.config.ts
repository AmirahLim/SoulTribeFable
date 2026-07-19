import type { Config } from "tailwindcss";

/**
 * Soul Tribe design tokens.
 *
 * Palette follows the PRD visual direction: warm sand, off-white cream,
 * muted terracotta, deep forest green and sparing gold. All colors are
 * expressed as CSS variables (see globals.css) so a dark theme can be
 * enabled later by toggling the `dark` class — no component changes needed.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "rgb(var(--sand-50) / <alpha-value>)",
          100: "rgb(var(--sand-100) / <alpha-value>)",
          200: "rgb(var(--sand-200) / <alpha-value>)",
          300: "rgb(var(--sand-300) / <alpha-value>)",
          400: "rgb(var(--sand-400) / <alpha-value>)",
        },
        terracotta: {
          300: "rgb(var(--terracotta-300) / <alpha-value>)",
          400: "rgb(var(--terracotta-400) / <alpha-value>)",
          500: "rgb(var(--terracotta-500) / <alpha-value>)",
          600: "rgb(var(--terracotta-600) / <alpha-value>)",
          700: "rgb(var(--terracotta-700) / <alpha-value>)",
        },
        forest: {
          400: "rgb(var(--forest-400) / <alpha-value>)",
          500: "rgb(var(--forest-500) / <alpha-value>)",
          600: "rgb(var(--forest-600) / <alpha-value>)",
          700: "rgb(var(--forest-700) / <alpha-value>)",
        },
        gold: {
          400: "rgb(var(--gold-400) / <alpha-value>)",
          500: "rgb(var(--gold-500) / <alpha-value>)",
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
          sunken: "rgb(var(--surface-sunken) / <alpha-value>)",
        },
        danger: "rgb(var(--danger) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["'Nunito Sans'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 2px 12px rgb(59 46 37 / 0.06), 0 1px 3px rgb(59 46 37 / 0.04)",
        lift: "0 8px 30px rgb(59 46 37 / 0.10), 0 2px 8px rgb(59 46 37 / 0.05)",
        glow: "0 0 0 3px rgb(196 106 74 / 0.18)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s linear infinite",
        "fade-up": "fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
