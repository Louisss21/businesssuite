"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Hit {
  type: string;
  label: string;
  sub: string;
  href: string;
}

export function SearchPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K öffnen, ESC schließen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else {
      setQ("");
      setHits([]);
    }
  }, [open]);

  // debounced Suche
  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setHits((await res.json()).data);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-50"
      >
        <span>🔍 Suche</span>
        <kbd className="hidden rounded bg-slate-100 px-1.5 text-xs sm:inline">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-24">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Kunden, Leads, Angebote, Rechnungen, Produkte, Seriennummern…"
              className="w-full border-b border-slate-200 px-4 py-3 text-sm outline-none"
            />
            <div className="max-h-80 overflow-y-auto">
              {loading && <div className="px-4 py-3 text-sm text-slate-400">Suche…</div>}
              {!loading && q.trim().length >= 2 && hits.length === 0 && (
                <div className="px-4 py-3 text-sm text-slate-400">Keine Treffer.</div>
              )}
              {hits.map((h, i) => (
                <button
                  key={i}
                  onClick={() => go(h.href)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                      {h.type}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{h.label}</span>
                  </span>
                  {h.sub && <span className="truncate text-xs text-slate-400">{h.sub}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
