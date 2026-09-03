import type { Config } from "tailwindcss";

/**
 * Sustable-Theme (Dark + Light). Statt jede Seite umzuschreiben, werden die
 * bestehenden Tailwind-Farbtoken (white, slate-*, brand-*) zentral auf
 * CSS-Variablen umgelegt – die konkreten Werte pro Theme stehen in
 * globals.css (:root = Dark, html[data-theme="light"] = Light).
 *
 *  bg-white   -> var(--c-white)   (Dark: Surface #0F0F11, Light: echtes Weiß)
 *  slate-*    -> Graustufen pro Theme (Dark invertiert, Light Standard)
 *  brand-*    -> Sustable-Orange-Akzent
 *
 * Die Variablen sind RGB-Tripel ("15 15 17"), damit Opazitäts-Modifier
 * (z. B. ring-brand-600/40) weiter funktionieren.
 *
 * Hinweis: Modal-Overlays nutzen bewusst bg-black/* (nicht slate-900/*),
 * da slate-900 im Dark-Theme zu Weiß invertiert.
 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sustable-Tokens (für gezielte Nutzung)
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        text: "var(--text)",
        muted: "var(--muted)",
        "muted-2": "var(--muted-2)",
        accent: "var(--accent)",

        // bestehende Klassen auf Theme-Variablen umlegen
        white: v("--c-white"),
        brand: {
          50: v("--brand-50"),
          100: v("--brand-100"),
          500: v("--brand-500"),
          600: v("--brand-600"),
          700: v("--brand-700"),
        },
        slate: {
          50: v("--slate-50"),
          100: v("--slate-100"),
          200: v("--slate-200"),
          300: v("--slate-300"),
          400: v("--slate-400"),
          500: v("--slate-500"),
          600: v("--slate-600"),
          700: v("--slate-700"),
          800: v("--slate-800"),
          900: v("--slate-900"),
        },
        // Status-Familien: -50/-100 = dezenter Tint (Pillen/Alerts),
        // -600/-700 = Akzenttext. Werte pro Theme in globals.css.
        green: {
          100: v("--green-100"),
          600: v("--green-600"),
          700: v("--green-700"),
        },
        red: {
          50: v("--red-50"),
          100: v("--red-100"),
          300: v("--red-300"),
          600: v("--red-600"),
          700: v("--red-700"),
        },
        amber: {
          50: v("--amber-50"),
          100: v("--amber-100"),
          600: v("--amber-600"),
          700: v("--amber-700"),
        },
        blue: {
          100: v("--blue-100"),
          700: v("--blue-700"),
        },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["'Geist Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "16px",
        badge: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
