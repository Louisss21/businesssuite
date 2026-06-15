"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Select } from "@/components/ui";

type ModelOption = { id: string; name: string; steps: number };

export function StartProduction({ models }: { models: ModelOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!modelId) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableModelId: modelId }),
    });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/production/${data.id}`);
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Start fehlgeschlagen");
    }
  }

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Sustable bauen</Button>;
  }

  return (
    <Card className="mb-6 p-6">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Montage starten</h3>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Modell">
          <Select value={modelId} onChange={(e) => setModelId(e.target.value)} className="min-w-56">
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.steps} Schritte)
              </option>
            ))}
          </Select>
        </Field>
        <Button onClick={start} disabled={busy || !modelId}>
          {busy ? "Starte…" : "Montage starten"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {models.length === 0 && (
        <p className="mt-2 text-sm text-amber-600">Noch kein aktives Modell. Lege eines unter „Modelle" an.</p>
      )}
    </Card>
  );
}
