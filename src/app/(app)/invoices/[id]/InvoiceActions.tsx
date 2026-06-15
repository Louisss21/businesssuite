"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function InvoiceActions({
  id,
  status,
  isCancellation,
}: {
  id: string;
  status: string;
  isCancellation: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isCancellation) return null;

  async function action(path: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/invoices/${id}/${path}`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Aktion fehlgeschlagen");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "OVERDUE" && (
        <Button type="button" variant="ghost" onClick={() => action("dunning")} disabled={busy}>
          Mahnung erstellen
        </Button>
      )}
      {(status === "OPEN" || status === "OVERDUE") && (
        <Button
          type="button"
          variant="danger"
          onClick={() => action("cancel", "Rechnung wirklich stornieren? Es wird eine Stornorechnung erzeugt.")}
          disabled={busy}
        >
          Stornieren
        </Button>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
