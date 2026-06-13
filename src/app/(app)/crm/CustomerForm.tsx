"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

export function CustomerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("COMPANY");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Neuer Kunde</Button>;

  return (
    <Card className="mb-6 p-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Typ">
            <Select name="type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="COMPANY">Firmenkunde</option>
              <option value="PRIVATE">Privatkunde</option>
            </Select>
          </Field>
          {type === "COMPANY" ? (
            <Field label="Firmenname">
              <Input name="companyName" required />
            </Field>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vorname">
                <Input name="firstName" required />
              </Field>
              <Field label="Nachname">
                <Input name="lastName" required />
              </Field>
            </div>
          )}
          <Field label="E-Mail">
            <Input name="email" type="email" />
          </Field>
          <Field label="Telefon">
            <Input name="phone" />
          </Field>
          <Field label="Straße">
            <Input name="street" />
          </Field>
          <Field label="PLZ">
            <Input name="postalCode" />
          </Field>
          <Field label="Ort">
            <Input name="city" />
          </Field>
          <Field label="USt-IdNr.">
            <Input name="vatId" />
          </Field>
          <Field label="Steuernummer">
            <Input name="taxNumber" />
          </Field>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichern…" : "Speichern"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Card>
  );
}
