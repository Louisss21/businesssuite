"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** A6.2: Stößt einen Gmail-Postfach-Scan manuell an. */
export function ScanInboxButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function scan() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/incoming-invoices/scan", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      const d = body.data ?? {};
      setMsg(`${d.imported ?? 0} importiert, ${d.skipped ?? 0} übersprungen.`);
      router.refresh();
    } else {
      setMsg(body.error ?? "Scan fehlgeschlagen");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-sm text-slate-500">{msg}</span>}
      <button
        onClick={scan}
        disabled={busy}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? "Scanne…" : "✉ Postfach scannen"}
      </button>
    </div>
  );
}
