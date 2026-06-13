"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

type CustomerOption = { id: string; name: string };
type Line = { productName: string; quantity: string; unitPrice: string; taxRate: string };

const emptyLine = (taxRate: number): Line => ({
  productName: "",
  quantity: "1",
  unitPrice: "0",
  taxRate: String(taxRate),
});

export function OrderForm({
  customers,
  defaultTaxRate,
}: {
  customers: CustomerOption[];
  defaultTaxRate: number;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(defaultTaxRate)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, key: keyof Line, value: string) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

  const net = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0,
  );
  const tax = lines.reduce(
    (s, l) =>
      s +
      (Number(l.quantity) || 0) *
        (Number(l.unitPrice) || 0) *
        ((Number(l.taxRate) || 0) / 100),
    0,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerId, notes, items: lines }),
    });
    setSaving(false);
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/orders/${data.id}`);
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Kunde">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">— Kunde wählen —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notizen">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-900">Positionen</div>
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-5"
                  placeholder="Produktname"
                  value={l.productName}
                  onChange={(e) => update(i, "productName", e.target.value)}
                  required
                />
                <Input
                  className="col-span-2"
                  type="number"
                  step="0.001"
                  placeholder="Menge"
                  value={l.quantity}
                  onChange={(e) => update(i, "quantity", e.target.value)}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  step="0.01"
                  placeholder="Preis"
                  value={l.unitPrice}
                  onChange={(e) => update(i, "unitPrice", e.target.value)}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  step="0.01"
                  placeholder="MwSt %"
                  value={l.taxRate}
                  onChange={(e) => update(i, "taxRate", e.target.value)}
                />
                <button
                  type="button"
                  className="col-span-1 text-slate-400 hover:text-red-600"
                  onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                  disabled={lines.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-brand-700"
            onClick={() => setLines((ls) => [...ls, emptyLine(defaultTaxRate)])}
          >
            + Position hinzufügen
          </button>
        </div>

        <div className="flex justify-end gap-8 border-t border-slate-100 pt-4 text-sm">
          <div>
            Netto: <strong>{net.toFixed(2)} €</strong>
          </div>
          <div>
            MwSt: <strong>{tax.toFixed(2)} €</strong>
          </div>
          <div>
            Brutto: <strong>{(net + tax).toFixed(2)} €</strong>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !customerId}>
            {saving ? "Speichern…" : "Bestellung anlegen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
