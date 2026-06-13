"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

type CustomerOption = { id: string; name: string };

export function LeadForm({ customers }: { customers: CustomerOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd) as Record<string, unknown>;
    if (!payload.customerId) payload.customerId = null;
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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

  if (!open) return <Button onClick={() => setOpen(true)}>+ Neuer Lead</Button>;

  return (
    <Card className="mb-6 p-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Titel">
            <Input name="title" required />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="NEW">
              <option value="NEW">NEW</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
            </Select>
          </Field>
          <Field label="Kunde (optional)">
            <Select name="customerId" defaultValue="">
              <option value="">— kein Bezug —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Notizen">
            <Input name="notes" />
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
