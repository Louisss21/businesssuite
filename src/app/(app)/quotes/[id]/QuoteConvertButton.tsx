"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function QuoteConvertButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function convert() {
    if (!confirm("Dieses Angebot in einen Auftrag umwandeln?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quotes/${id}/convert`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/orders/${data.id}`);
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Umwandlung fehlgeschlagen");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={convert} disabled={busy}>
        {busy ? "Wandle um…" : "→ In Auftrag umwandeln"}
      </Button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
