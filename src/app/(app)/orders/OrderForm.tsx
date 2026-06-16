"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { orderStatuses } from "@/modules/orders/order.schema";

type CustomerOption = { id: string; name: string };
export type ProductOption = {
  id: string;
  sku: string;
  name: string;
  priceNet: number;
  taxRate: number;
  unit: string;
};
type Line = {
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
};

export type OrderEditData = {
  id: string;
  customerId: string;
  status: string;
  notes: string;
  items: { productName: string; quantity: number; unitPrice: number; taxRate: number }[];
};

const emptyLine = (taxRate: number): Line => ({
  productId: "",
  productName: "",
  quantity: "1",
  unitPrice: "0",
  taxRate: String(taxRate),
});

export function OrderForm({
  customers,
  products = [],
  defaultTaxRate,
  order,
  hasInvoice = false,
}: {
  customers: CustomerOption[];
  products?: ProductOption[];
  defaultTaxRate: number;
  /** Wenn gesetzt: Bearbeitungsmodus (A5.1) statt Neuanlage. */
  order?: OrderEditData;
  /** Bei vorhandener Rechnung sind Positionen gesperrt (Integrität). */
  hasInvoice?: boolean;
}) {
  const router = useRouter();
  const editing = !!order;
  const [customerId, setCustomerId] = useState(order?.customerId ?? "");
  const [status, setStatus] = useState(order?.status ?? "DRAFT");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(
    order && order.items.length
      ? order.items.map((it) => ({
          productId: "",
          productName: it.productName,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          taxRate: String(it.taxRate),
        }))
      : [emptyLine(defaultTaxRate)],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const update = (i: number, key: keyof Line, value: string) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));

  const selectProduct = (i: number, productId: string) =>
    setLines((ls) =>
      ls.map((l, idx) => {
        if (idx !== i) return l;
        const p = products.find((x) => x.id === productId);
        if (!p) return { ...l, productId: "" };
        return {
          ...l,
          productId,
          productName: p.name,
          unitPrice: String(p.priceNet),
          taxRate: String(p.taxRate),
        };
      }),
    );

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
    setDone(false);

    const url = editing ? `/api/orders/${order!.id}` : "/api/orders";
    const method = editing ? "PUT" : "POST";
    // Bei vorhandener Rechnung Positionen NICHT mitsenden (Service blockt das).
    const payload =
      editing && hasInvoice
        ? { customerId, status, notes }
        : editing
          ? { customerId, status, notes, items: lines }
          : { customerId, notes, items: lines };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      if (editing) {
        setDone(true);
        router.refresh();
      } else {
        const { data } = await res.json();
        router.push(`/orders/${data.id}`);
      }
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
          {editing && (
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                {orderStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Notizen">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-slate-900">Positionen</div>
          {hasInvoice && (
            <p className="mb-2 text-sm text-amber-600">
              Diese Bestellung ist bereits abgerechnet – Positionen sind gesperrt.
              Status und Notizen können weiterhin geändert werden.
            </p>
          )}
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3">
                {products.length > 0 && !hasInvoice && (
                  <div className="mb-2">
                    <Select
                      value={l.productId}
                      onChange={(e) => selectProduct(i, e.target.value)}
                    >
                      <option value="">— Produkt wählen (oder Freitext unten) —</option>
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
                    className="col-span-2 sm:col-span-5"
                    placeholder="Produktname"
                    value={l.productName}
                    onChange={(e) => update(i, "productName", e.target.value)}
                    required
                    disabled={hasInvoice}
                  />
                  <Input
                    className="col-span-1 sm:col-span-2"
                    type="number"
                    step="0.001"
                    placeholder="Menge"
                    value={l.quantity}
                    onChange={(e) => update(i, "quantity", e.target.value)}
                    disabled={hasInvoice}
                  />
                  <Input
                    className="col-span-1 sm:col-span-2"
                    type="number"
                    step="0.01"
                    placeholder="Preis"
                    value={l.unitPrice}
                    onChange={(e) => update(i, "unitPrice", e.target.value)}
                    disabled={hasInvoice}
                  />
                  <Input
                    className="col-span-1 sm:col-span-2"
                    type="number"
                    step="0.01"
                    placeholder="MwSt %"
                    value={l.taxRate}
                    onChange={(e) => update(i, "taxRate", e.target.value)}
                    disabled={hasInvoice}
                  />
                  <button
                    type="button"
                    className="col-span-1 text-slate-400 hover:text-red-600 disabled:opacity-40 sm:col-span-1"
                    onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                    disabled={lines.length === 1 || hasInvoice}
                    aria-label="Position entfernen"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!hasInvoice && (
            <button
              type="button"
              className="mt-2 text-sm font-medium text-brand-700"
              onClick={() => setLines((ls) => [...ls, emptyLine(defaultTaxRate)])}
            >
              + Position hinzufügen
            </button>
          )}
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
        {done && <p className="text-sm text-green-600">Gespeichert.</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !customerId}>
            {saving ? "Speichern…" : editing ? "Änderungen speichern" : "Bestellung anlegen"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
