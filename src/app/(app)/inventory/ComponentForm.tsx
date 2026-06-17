"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

export type ComponentEdit = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  minStock: number;
  reorderEmail: string | null;
  supplierId: string | null;
  stockQty: number;
};

export function ComponentForm({
  component,
  suppliers,
}: {
  component?: ComponentEdit;
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const editing = !!component;
  const [sku, setSku] = useState(component?.sku ?? "");
  const [name, setName] = useState(component?.name ?? "");
  const [description, setDescription] = useState(component?.description ?? "");
  const [unit, setUnit] = useState(component?.unit ?? "Stück");
  const [minStock, setMinStock] = useState(String(component?.minStock ?? 10));
  const [reorderEmail, setReorderEmail] = useState(component?.reorderEmail ?? "");
  const [supplierId, setSupplierId] = useState(component?.supplierId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await fetch(editing ? `/api/components/${component!.id}` : "/api/components", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, name, description, unit, minStock, reorderEmail, supplierId }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      if (editing) {
        setDone(true);
        router.refresh();
      } else {
        router.push(`/inventory/${j.data.id}`);
      }
    } else {
      setError(j.error ?? "Speichern fehlgeschlagen");
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="SKU">
            <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
          </Field>
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Einheit">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
          </Field>
          <Field label="Mindestbestand">
            <Input type="number" value={minStock} onChange={(e) => setMinStock(e.target.value)} />
          </Field>
          <Field label="Nachbestell-E-Mail (optional)">
            <Input type="email" value={reorderEmail} onChange={(e) => setReorderEmail(e.target.value)} />
          </Field>
          <Field label="Lieferant (optional)">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— kein Lieferant —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Beschreibung (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </Field>

        {editing && (
          <p className="text-xs text-slate-500">
            Aktueller Bestand: <strong>{component!.stockQty} {component!.unit}</strong> – Änderung
            erfolgt nachvollziehbar über „Buchen" im Lager (nicht hier).
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {done && <p className="text-sm text-green-600">Gespeichert.</p>}
        <Button type="submit" disabled={busy || !sku || !name}>
          {busy ? "Speichern…" : editing ? "Änderungen speichern" : "Bauteil anlegen"}
        </Button>
      </form>
    </Card>
  );
}
