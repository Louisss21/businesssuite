"use client";

import { useState } from "react";

type Kind = "invoice" | "quote" | "order";

const PATH: Record<Kind, string> = {
  invoice: "invoices",
  quote: "quotes",
  order: "orders",
};

const ORDER_TYPES = [
  { value: "confirmation", label: "Auftragsbestätigung" },
  { value: "deliverynote", label: "Lieferschein" },
  { value: "quote", label: "Angebot" },
];

/** Punkt 7: Beleg als PDF-Anhang per E-Mail senden (Empfänger editierbar). */
export function SendDocumentButton({
  kind,
  id,
  defaultEmail,
  label = "✉ Per E-Mail senden",
}: {
  kind: Kind;
  id: string;
  defaultEmail?: string | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(defaultEmail ?? "");
  const [type, setType] = useState("confirmation");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/${PATH[kind]}/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind === "order" ? { to, type } : { to }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setMsg({ ok: true, text: `Gesendet an ${to}.` });
    else setMsg({ ok: false, text: j.error ?? "Versand fehlgeschlagen" });
  }

  return (
    <>
      <button
        onClick={() => {
          setMsg(null);
          setOpen(true);
        }}
        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-slate-900">Beleg per E-Mail senden</h3>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Empfänger</span>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="kunde@example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </label>

            {kind === "order" && (
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Dokument</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  {ORDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {msg && (
              <p className={`mt-3 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Schließen
              </button>
              <button
                onClick={send}
                disabled={busy || !to}
                className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {busy ? "Senden…" : "Senden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
