"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

/**
 * Kompakte Aufgaben-Schnellanlage für Kunden-/Lead-Detailseiten.
 * Verknüpft die Aufgabe automatisch mit dem Kunden bzw. Lead.
 */
export function TaskQuickAdd({
  presetCustomerId,
  presetLeadId,
}: {
  presetCustomerId?: string;
  presetLeadId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = Object.fromEntries(fd);
    if (presetCustomerId) payload.relatedCustomerId = presetCustomerId;
    if (presetLeadId) payload.relatedLeadId = presetLeadId;
    const res = await fetch("/api/tasks", {
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

  if (!open) {
    return (
      <Button variant="ghost" onClick={() => setOpen(true)}>
        + Aufgabe
      </Button>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Neue Aufgabe</h3>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Titel">
          <Input name="title" required autoFocus />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Fällig am">
            <Input name="dueAt" type="date" />
          </Field>
          <Field label="Priorität">
            <Select name="priority" defaultValue="MEDIUM">
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </Select>
          </Field>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Speichern…" : "Anlegen"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </Card>
  );
}
