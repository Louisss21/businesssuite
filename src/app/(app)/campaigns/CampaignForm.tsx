"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

const TYPES = ["POST", "EMAIL", "PHONE", "MIXED"];

export function CampaignForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    setSaving(false);
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/campaigns/${data.id}`);
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input name="name" required />
          </Field>
          <Field label="Typ">
            <Select name="type" defaultValue="POST">
              {TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Startdatum">
            <Input name="startDate" type="date" />
          </Field>
          <Field label="Enddatum">
            <Input name="endDate" type="date" />
          </Field>
          <Field label="Budget (€)">
            <Input name="budget" type="number" step="0.01" />
          </Field>
        </div>
        <Field label="Notizen">
          <Input name="notes" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Speichern…" : "Kampagne anlegen"}
        </Button>
      </form>
    </Card>
  );
}
