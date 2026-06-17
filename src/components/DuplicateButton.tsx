"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Dupliziert eine Entität (POST auf `url`) und springt danach in die
 * Bearbeiten-Ansicht der Kopie (`redirectBase` + neue ID).
 */
export function DuplicateButton({
  url,
  redirectBase,
  label = "Duplizieren",
  iconOnly = false,
}: {
  url: string;
  redirectBase: string;
  label?: string;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch(url, { method: "POST" });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.data?.id) {
      router.push(`${redirectBase}${j.data.id}`);
    } else {
      setBusy(false);
      alert(j.error ?? "Duplizieren fehlgeschlagen");
    }
  }

  if (iconOnly) {
    return (
      <button
        onClick={run}
        disabled={busy}
        title="Duplizieren"
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-50"
      >
        ⧉
      </button>
    );
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
    >
      {busy ? "Dupliziere…" : `⧉ ${label}`}
    </button>
  );
}
