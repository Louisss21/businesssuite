"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input } from "@/components/ui";

type Settings = Record<string, string | number>;

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Gespeichert.");
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  const v = (k: string) => String(initial[k] ?? "");

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Firmeninformationen</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Firmenname">
            <Input name="companyName" defaultValue={v("companyName")} />
          </Field>
          <Field label="E-Mail">
            <Input name="email" type="email" defaultValue={v("email")} />
          </Field>
          <Field label="Straße">
            <Input name="street" defaultValue={v("street")} />
          </Field>
          <Field label="Telefon">
            <Input name="phone" defaultValue={v("phone")} />
          </Field>
          <Field label="PLZ">
            <Input name="postalCode" defaultValue={v("postalCode")} />
          </Field>
          <Field label="Ort">
            <Input name="city" defaultValue={v("city")} />
          </Field>
          <Field label="Steuernummer">
            <Input name="taxNumber" defaultValue={v("taxNumber")} />
          </Field>
          <Field label="USt-IdNr.">
            <Input name="vatId" defaultValue={v("vatId")} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Bankverbindung (für Rechnungs-PDF)</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Bank">
            <Input name="bankName" defaultValue={v("bankName")} />
          </Field>
          <Field label="IBAN">
            <Input name="iban" defaultValue={v("iban")} />
          </Field>
          <Field label="BIC">
            <Input name="bic" defaultValue={v("bic")} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Rechnungs-Einstellungen</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Rechnungsnummern-Format">
            <Input name="invoiceNumberFormat" defaultValue={v("invoiceNumberFormat")} />
          </Field>
          <Field label="Bestellnummern-Format">
            <Input name="orderNumberFormat" defaultValue={v("orderNumberFormat")} />
          </Field>
          <Field label="Angebotsnummern-Format">
            <Input name="quoteNumberFormat" defaultValue={v("quoteNumberFormat")} />
          </Field>
          <Field label="Standard-Zahlungsziel (Tage)">
            <Input name="defaultPaymentTermDays" type="number" defaultValue={v("defaultPaymentTermDays")} />
          </Field>
          <Field label="Standard-MwSt (%)">
            <Input name="defaultTaxRate" type="number" step="0.01" defaultValue={v("defaultTaxRate")} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Rechnungs-Fußzeile / Zahlungshinweis">
            <Input name="invoiceFooter" defaultValue={v("invoiceFooter")} />
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Platzhalter: {"{YYYY}"} Jahr · {"{SEQ:4}"} laufende Nummer (4-stellig). Beispiel: INV-2026-0001
        </p>
      </Card>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Speichern…" : "Speichern"}
        </Button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
