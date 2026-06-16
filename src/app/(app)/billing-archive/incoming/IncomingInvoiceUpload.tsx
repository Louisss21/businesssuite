"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

/** A6.1: Eingangsrechnung hochladen (Datei + Metadaten). */
export function IncomingInvoiceUpload() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/incoming-invoices", { method: "POST", body: fd });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      formRef.current?.reset();
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Upload fehlgeschlagen");
    }
  }

  return (
    <Card className="mb-6 p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Eingangsrechnung hochladen</h3>
      <form ref={formRef} onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Lieferant">
            <Input name="supplierName" required />
          </Field>
          <Field label="Rechnungsnummer">
            <Input name="invoiceNo" />
          </Field>
          <Field label="Rechnungsdatum">
            <Input name="invoiceDate" type="date" required />
          </Field>
          <Field label="Netto (€)">
            <Input name="amountNet" type="number" step="0.01" />
          </Field>
          <Field label="MwSt (€)">
            <Input name="taxAmount" type="number" step="0.01" />
          </Field>
          <Field label="Brutto (€)">
            <Input name="amountGross" type="number" step="0.01" />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="OPEN">
              <option value="OPEN">Offen</option>
              <option value="PAID">Bezahlt</option>
            </Select>
          </Field>
          <Field label="Datei (PDF/PNG/JPG)">
            <input
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              required
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
            />
          </Field>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {done && <p className="text-sm text-green-600">Hochgeladen.</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Wird hochgeladen…" : "Hochladen"}
        </Button>
      </form>
    </Card>
  );
}
