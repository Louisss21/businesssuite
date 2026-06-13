"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select, Badge } from "@/components/ui";

const CLASSIFICATIONS = ["A-Kunde", "B-Kunde", "C-Kunde", "VIP"];
const SOURCES = [
  "Organisch",
  "Kampagne",
  "Empfehlung",
  "Messe",
  "Außendienst",
  "Online-Shop",
];

export interface CustomerScalars {
  id: string;
  type: "COMPANY" | "PRIVATE";
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  shippingStreet: string | null;
  shippingZip: string | null;
  shippingCity: string | null;
  vatId: string | null;
  taxNumber: string | null;
  notes: string | null;
  classification: string | null;
  source: string | null;
  newsletterOptIn: boolean;
}

export function CustomerInfoCard({ customer }: { customer: CustomerScalars }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState(customer.type);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      ...Object.fromEntries(fd),
      newsletterOptIn: fd.get("newsletterOptIn") === "on",
    };
    const res = await fetch(`/api/customers/${customer.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  const v = (x: string | null) => x ?? "";

  if (!editing) {
    return (
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Stammdaten</h3>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="E-Mail" value={customer.email} />
          <Row label="Telefon" value={customer.phone} />
          <Row
            label="Adresse"
            value={[customer.street, `${v(customer.postalCode)} ${v(customer.city)}`.trim()]
              .filter(Boolean)
              .join(", ")}
          />
          {(customer.shippingStreet || customer.shippingCity) && (
            <Row
              label="Lieferadresse"
              value={[
                customer.shippingStreet,
                `${v(customer.shippingZip)} ${v(customer.shippingCity)}`.trim(),
              ]
                .filter(Boolean)
                .join(", ")}
            />
          )}
          <Row label="USt-IdNr." value={customer.vatId} />
          <Row label="Steuernummer" value={customer.taxNumber} />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <dt className="text-slate-500">Klassifizierung</dt>
            <dd>{customer.classification ? <Badge value={customer.classification} /> : "—"}</dd>
          </div>
          <Row label="Quelle" value={customer.source} />
          <Row label="Newsletter" value={customer.newsletterOptIn ? "Ja" : "Nein"} />
          {customer.notes && (
            <div className="pt-2">
              <dt className="mb-1 text-slate-500">Notizen</dt>
              <dd className="whitespace-pre-wrap rounded-md bg-slate-50 p-2 text-slate-700">
                {customer.notes}
              </dd>
            </div>
          )}
        </dl>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Kunde bearbeiten</h3>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Typ">
            <Select name="type" value={type} onChange={(e) => setType(e.target.value as never)}>
              <option value="COMPANY">Firmenkunde</option>
              <option value="PRIVATE">Privatkunde</option>
            </Select>
          </Field>
          {type === "COMPANY" ? (
            <Field label="Firmenname">
              <Input name="companyName" defaultValue={v(customer.companyName)} required />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Vorname">
                <Input name="firstName" defaultValue={v(customer.firstName)} required />
              </Field>
              <Field label="Nachname">
                <Input name="lastName" defaultValue={v(customer.lastName)} required />
              </Field>
            </div>
          )}
          <Field label="E-Mail">
            <Input name="email" type="email" defaultValue={v(customer.email)} />
          </Field>
          <Field label="Telefon">
            <Input name="phone" defaultValue={v(customer.phone)} />
          </Field>
          <Field label="Straße">
            <Input name="street" defaultValue={v(customer.street)} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="PLZ">
              <Input name="postalCode" defaultValue={v(customer.postalCode)} />
            </Field>
            <Field label="Ort">
              <Input name="city" defaultValue={v(customer.city)} />
            </Field>
          </div>
          <Field label="Lieferadresse Straße">
            <Input name="shippingStreet" defaultValue={v(customer.shippingStreet)} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Liefer-PLZ">
              <Input name="shippingZip" defaultValue={v(customer.shippingZip)} />
            </Field>
            <Field label="Liefer-Ort">
              <Input name="shippingCity" defaultValue={v(customer.shippingCity)} />
            </Field>
          </div>
          <Field label="USt-IdNr.">
            <Input name="vatId" defaultValue={v(customer.vatId)} />
          </Field>
          <Field label="Steuernummer">
            <Input name="taxNumber" defaultValue={v(customer.taxNumber)} />
          </Field>
          <Field label="Klassifizierung">
            <Select name="classification" defaultValue={v(customer.classification)}>
              <option value="">— keine —</option>
              {CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quelle">
            <Select name="source" defaultValue={v(customer.source)}>
              <option value="">— keine —</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Notizen (intern)">
          <textarea
            name="notes"
            defaultValue={v(customer.notes)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="newsletterOptIn"
            defaultChecked={customer.newsletterOptIn}
            className="h-4 w-4 rounded border-slate-300"
          />
          Newsletter-Einwilligung
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value || "—"}</dd>
    </div>
  );
}
