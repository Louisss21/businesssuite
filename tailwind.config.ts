import type { Config } from "tailwindcss";

/**
 * Sustable-Dark-Theme. Statt jede Seite umzuschreiben, werden die bestehenden
 * Tailwind-Farbtoken (white, slate-*, brand-*) zentral auf das Dark/Orange-
 * System umgelegt – Funktionen/Markup bleiben unangetastet.
 *
 *  bg-white   -> Surface #0F0F11   (text-white -> nahezu schwarz, ideal auf Orange)
 *  slate-*    -> invertierte Dark-Graustufen (slate-900 = weiß, slate-50 = dunkel)
 *  brand-*    -> Sustable-Orange-Akzent
 *
 * Hinweis: Modal-Overlays nutzen bewusst bg-black/* (nicht slate-900/*),
 * da slate-900 hier zu Weiß invertiert.
 */
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

        // bestehende Klassen auf Dark umlegen
        white: "#0F0F11",
        brand: {
          50: "#1C1C21",
          100: "#26262B",
          500: "#F07D00",
          600: "#F07D00",
          700: "#FF8C1A",
        },
        slate: {
          50: "#16161A",
          100: "#1C1C21",
          200: "#23232A",
          300: "#2E2E35",
          400: "#6E6E73",
          500: "#9A9AA2",
          600: "#A6A6AE",
          700: "#C9C9CF",
          800: "#E5E5E8",
          900: "#FFFFFF",
        },
        // Status-Familien auf Dark umlegen: -50/-100 = dezenter Tint (Pillen/
        // Alerts), -600/-700 = heller Akzenttext. So entspricht jedes
        // "bg-X-100 text-X-700"-Pill automatisch dem Sustable-Status.
        green: {
          100: "#10241C",
          600: "#34D399",
          700: "#34D399",
        },
        red: {
          50: "#2A1416",
          100: "#2A1416",
          300: "#4A2024",
          600: "#F87171",
          700: "#FB8585",
        },
        amber: {
          50: "#241F12",
          100: "#2A2410",
          600: "#FBBF24",
          700: "#FBBF24",
        },
        blue: {
          100: "#15233A",
          700: "#60A5FA",
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
