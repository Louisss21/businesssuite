"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Wiederverwendbarer Löschen-Button mit **gestyltem** Bestätigungsdialog
 * (statt window.confirm). Nennt das Objekt und zeigt Server-Fehler inline.
 * - iconOnly: kompaktes 🗑 für Tabellenzeilen
 * - sonst: beschrifteter roter Button (z. B. auf Detailseiten)
 */
export function DeleteButton({
  url,
  confirmText,
  redirectTo,
  label = "Löschen",
  iconOnly = false,
}: {
  url: string;
  confirmText: string;
  redirectTo?: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function ask(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setOpen(true);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Löschen fehlgeschlagen");
    }
  }

  return (
    <>
      {iconOnly ? (
        <button
          type="button"
          onClick={ask}
          disabled={busy}
          title="Löschen"
          aria-label="Löschen"
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          🗑
        </button>
      ) : (
        <button
          type="button"
          onClick={ask}
          disabled={busy}
          className="inline-flex items-center rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          {label}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !busy && setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Löschen bestätigen</h3>
            <p className="mt-2 text-sm text-slate-600">{confirmText}</p>
            {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Löschen…" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
