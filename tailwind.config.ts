import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          500: "#2f6df0",
          600: "#1f59d6",
          700: "#1b49ad",
        },
      },
    },
  },
  plugins: [],
};

export default config;
