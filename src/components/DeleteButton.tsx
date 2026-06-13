"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Wiederverwendbarer Löschen-Button mit Bestätigungsdialog.
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
  const [busy, setBusy] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    const res = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      window.alert(b.error ?? "Löschen fehlgeschlagen");
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        title="Löschen"
        aria-label="Löschen"
        className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        🗑
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center rounded-lg border border-red-300 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "Löschen…" : label}
    </button>
  );
}
