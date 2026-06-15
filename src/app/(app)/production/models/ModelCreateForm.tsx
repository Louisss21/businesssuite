"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

type ProductOption = { id: string; name: string };

export function ModelCreateForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/table-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/production/models/${data.id}`);
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Neues Modell</Button>;

  return (
    <Card className="mb-6 p-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input name="name" required placeholder="z. B. Sustable TWO" />
          </Field>
          <Field label="Fertigerzeugnis (Produkt)">
            <Select name="productId" defaultValue="">
              <option value="">— keines —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Beschreibung">
          <Input name="description" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy ? "…" : "Anlegen"}</Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
        </div>
      </form>
    </Card>
  );
}
