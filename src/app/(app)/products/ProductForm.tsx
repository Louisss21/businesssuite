"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input } from "@/components/ui";

export interface ProductScalars {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  priceNet: number;
  taxRate: number;
  stockQty: number;
  minStock: number;
  unit: string;
  active: boolean;
}

export function ProductForm({ product }: { product?: ProductScalars }) {
  const router = useRouter();
  const isEdit = !!product;
  const [open, setOpen] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      ...Object.fromEntries(fd),
      active: fd.get("active") === "on",
    };
    const res = await fetch(isEdit ? `/api/products/${product!.id}` : "/api/products", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      if (!isEdit) setOpen(false);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  if (!isEdit && !open) {
    return <Button onClick={() => setOpen(true)}>+ Neues Produkt</Button>;
  }

  const v = (x: string | number | null) => (x === null ? "" : String(x));

  return (
    <Card className={isEdit ? "p-6" : "mb-6 p-6"}>
      {!isEdit && <h3 className="mb-4 text-sm font-semibold text-slate-900">Neues Produkt</h3>}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="SKU / Artikelnummer">
            <Input name="sku" defaultValue={v(product?.sku ?? "")} required />
          </Field>
          <Field label="Name">
            <Input name="name" defaultValue={v(product?.name ?? "")} required />
          </Field>
          <Field label="Kategorie">
            <Input name="category" defaultValue={v(product?.categoryName ?? "")} placeholder="z. B. Hardware" />
          </Field>
          <Field label="Einheit">
            <Input name="unit" defaultValue={v(product?.unit ?? "Stück")} />
          </Field>
          <Field label="Nettopreis (€)">
            <Input name="priceNet" type="number" step="0.01" defaultValue={v(product?.priceNet ?? 0)} required />
          </Field>
          <Field label="MwSt (%)">
            <Input name="taxRate" type="number" step="0.01" defaultValue={v(product?.taxRate ?? 19)} />
          </Field>
          <Field label="Bestand">
            <Input name="stockQty" type="number" defaultValue={v(product?.stockQty ?? 0)} />
          </Field>
          <Field label="Mindestbestand">
            <Input name="minStock" type="number" defaultValue={v(product?.minStock ?? 0)} />
          </Field>
        </div>
        <Field label="Beschreibung">
          <textarea
            name="description"
            defaultValue={v(product?.description ?? "")}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="active"
            defaultChecked={product?.active ?? true}
            className="h-4 w-4 rounded border-slate-300"
          />
          Aktiv (im Verkauf verfügbar)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
          {!isEdit && (
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
