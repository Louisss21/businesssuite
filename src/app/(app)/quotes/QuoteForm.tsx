"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import type { ProductOption } from "@/app/(app)/orders/OrderForm";

type CustomerOption = { id: string; name: string };
type Line = {
  productId: string;
  name: string;
  qty: string;
  unitPrice: string;
  discountPct: string;
  taxRate: string;
};

export interface QuoteFormData {
  id: string;
  customerId: string;
  status: string;
  validUntil: string; // yyyy-mm-dd oder ""
  notes: string;
  items: {
    productId: string | null;
    name: string;
    qty: number;
    unitPrice: number;
    discountPct: number;
    taxRate: number;
  }[];
}

const STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

export function QuoteForm({
  customers,
  products = [],
  defaultTaxRate,
  quote,
}: {
  customers: CustomerOption[];
  products?: ProductOption[];
  defaultTaxRate: number;
  quote?: QuoteFormData;
}) {
  const router = useRouter();
  const isEdit = !!quote;

  const emptyLine = (): Line => ({
    productId: "",
    name: "",
    qty: "1",
    unitPrice: "0",
    discountPct: "0",
    taxRate: String(defaultTaxRate),
  });

  const [customerId, setCustomerId] = useState(quote?.customerId ?? "");
  const [status, setStatus] = useState(quote?.status ?? "DRAFT");
  const [validUntil, setValidUntil] = useState(quote?.validUntil ?? "");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(
    quote && quote.items.length
      ? quote.items.map((it) => ({
          productId: it.productId ?? "",
          name: it.name,
          qty: String(it.qty),
          unitPrice: String(it.unitPrice),
          discountPct: String(it.discountPct),
          taxRate: String(it.taxRate),
        }))
      : [emptyLine()],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, key: keyof Line, value: string) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

  const selectProduct = (i: number, productId: string) =>
    setLines((ls) =>
      ls.map((l, idx) => {
        if (idx !== i) return l;
        const p = products.find((x) => x.id === productId);
        if (!p) return { ...l, productId: "" };
        return { ...l, productId, name: p.name, unitPrice: String(p.priceNet), taxRate: String(p.taxRate) };
      }),
    );

  const lineNet = (l: Line) =>
    (Number(l.qty) || 0) * (Number(l.unitPrice) || 0) * (1 - (Number(l.discountPct) || 0) / 100);
  const net = lines.reduce((s, l) => s + lineNet(l), 0);
  const tax = lines.reduce((s, l) => s + lineNet(l) * ((Number(l.taxRate) || 0) / 100), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { customerId, status, validUntil, notes, items: lines };
    const res = await fetch(isEdit ? `/api/quotes/${quote!.id}` : "/api/quotes", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const { data } = await res.json();
      if (isEdit) router.refresh();
      else router.push(`/quotes/${data.id}`);
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Field label="Gültig bis">
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-900">Positionen</div>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                {products.length > 0 && (
                  <div className="mb-2">
                    <Select value={l.productId} onChange={(e) => selectProduct(i, e.target.value)}>
                      <option value="">— Produkt wählen (oder Freitext) —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} · {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                  <Input
                    className="col-span-2 sm:col-span-4"
                    placeholder="Bezeichnung"
                    value={l.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    required
                  />
                  <Input className="col-span-1 sm:col-span-2" type="number" step="0.001" placeholder="Menge" value={l.qty} onChange={(e) => update(i, "qty", e.target.value)} />
                  <Input className="col-span-1 sm:col-span-2" type="number" step="0.01" placeholder="Preis" value={l.unitPrice} onChange={(e) => update(i, "unitPrice", e.target.value)} />
                  <Input className="col-span-1 sm:col-span-2" type="number" step="0.01" placeholder="Rabatt %" value={l.discountPct} onChange={(e) => update(i, "discountPct", e.target.value)} />
                  <Input className="col-span-1 sm:col-span-1" type="number" step="0.01" placeholder="MwSt %" value={l.taxRate} onChange={(e) => update(i, "taxRate", e.target.value)} />
                  <button
                    type="button"
                    className="col-span-2 text-slate-400 hover:text-red-600 sm:col-span-1"
                    onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                    disabled={lines.length === 1}
                    aria-label="Position entfernen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-sm font-medium text-brand-700"
            onClick={() => setLines((ls) => [...ls, emptyLine()])}
          >
            + Position hinzufügen
          </button>
        </div>

        <Field label="Notizen">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>

        <div className="flex flex-wrap justify-end gap-6 border-t border-slate-100 pt-4 text-sm">
          <div>Netto: <strong>{net.toFixed(2)} €</strong></div>
          <div>MwSt: <strong>{tax.toFixed(2)} €</strong></div>
          <div>Brutto: <strong>{(net + tax).toFixed(2)} €</strong></div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={saving || !customerId}>
          {saving ? "Speichern…" : isEdit ? "Speichern" : "Angebot anlegen"}
        </Button>
      </form>
    </Card>
  );
}
