"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

/**
 * Dark/White-Mode-Umschalter. Das Theme liegt als data-theme auf <html>
 * (kein Attribut = Dark) und wird in localStorage ("bs-theme") gemerkt;
 * ein Inline-Script im Root-Layout setzt es vor dem ersten Paint.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    if (next === "light") {
      document.documentElement.dataset.theme = "light";
    } else {
      delete document.documentElement.dataset.theme;
    }
    try {
      localStorage.setItem("bs-theme", next);
    } catch {
      // privates Fenster o. Ä. – Theme gilt dann nur für diese Sitzung
    }
    setTheme(next);
  }

  return (
    <button
      onClick={toggle}
      className={`rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${className}`}
      title={theme === "dark" ? "White Mode aktivieren" : "Dark Mode aktivieren"}
      aria-label="Farbschema umschalten"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
