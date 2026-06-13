"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select, Badge } from "@/components/ui";

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "LOST", "WON"];

export interface LeadScalars {
  id: string;
  title: string;
  status: string;
  notes: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  score: number;
  tags: string[];
  source: string | null;
  lostReason: string | null;
  customerId: string | null;
}

export function LeadDetailForm({ lead }: { lead: LeadScalars }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [status, setStatus] = useState(lead.status);
  const [score, setScore] = useState(lead.score);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canConvert =
    !lead.customerId && (status === "QUALIFIED" || status === "WON");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch(`/api/leads/${lead.id}`, {
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

  async function convert() {
    if (!confirm("Diesen Lead in einen Kunden umwandeln?")) return;
    setConverting(true);
    setError(null);
    const res = await fetch(`/api/leads/${lead.id}/convert`, { method: "POST" });
    setConverting(false);
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/crm/${data.id}`);
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Umwandlung fehlgeschlagen");
    }
  }

  const v = (x: string | null) => x ?? "";

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Score */}
      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">
            Lead-Score: {score}/100
          </span>
          {lead.customerId ? (
            <Badge value="Umgewandelt" />
          ) : (
            <Badge value={status} />
          )}
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
        <input
          type="range"
          name="score"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="mt-3 w-full"
        />
      </Card>

      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Lead-Daten</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Titel">
            <Input name="title" defaultValue={lead.title} required />
          </Field>
          <Field label="Status">
            <Select name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vorname">
            <Input name="firstName" defaultValue={v(lead.firstName)} />
          </Field>
          <Field label="Nachname">
            <Input name="lastName" defaultValue={v(lead.lastName)} />
          </Field>
          <Field label="Firma">
            <Input name="company" defaultValue={v(lead.company)} />
          </Field>
          <Field label="Position">
            <Input name="position" defaultValue={v(lead.position)} />
          </Field>
          <Field label="E-Mail">
            <Input name="email" type="email" defaultValue={v(lead.email)} />
          </Field>
          <Field label="Telefon">
            <Input name="phone" defaultValue={v(lead.phone)} />
          </Field>
          <Field label="Quelle">
            <Input name="source" defaultValue={v(lead.source)} />
          </Field>
          <Field label="Tags (Komma-getrennt)">
            <Input name="tags" defaultValue={lead.tags.join(", ")} />
          </Field>
        </div>
        {status === "LOST" && (
          <div className="mt-4">
            <Field label="Verlustgrund">
              <Input name="lostReason" defaultValue={v(lead.lostReason)} />
            </Field>
          </div>
        )}
        <div className="mt-4">
          <Field label="Notizen">
            <textarea
              name="notes"
              defaultValue={v(lead.notes)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </Field>
        </div>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Speichern…" : "Speichern"}
        </Button>
        {canConvert && (
          <Button type="button" variant="primary" onClick={convert} disabled={converting}>
            {converting ? "Wandle um…" : "→ In Kunden umwandeln"}
          </Button>
        )}
        {lead.customerId && (
          <a href={`/crm/${lead.customerId}`} className="text-sm text-brand-700">
            Verknüpfter Kunde ansehen
          </a>
        )}
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </form>
  );
}
