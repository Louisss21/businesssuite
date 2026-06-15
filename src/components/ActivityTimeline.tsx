"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

const TYPES = ["NOTE", "CALL", "EMAIL", "MEETING", "VISIT"] as const;
const LABELS: Record<string, string> = {
  NOTE: "Notiz",
  CALL: "Anruf",
  EMAIL: "E-Mail",
  MEETING: "Meeting",
  VISIT: "Besuch",
};
const ICONS: Record<string, string> = {
  NOTE: "📝",
  CALL: "📞",
  EMAIL: "✉️",
  MEETING: "👥",
  VISIT: "📍",
};

export interface ActivityItem {
  id: string;
  type: string;
  subject: string;
  body: string | null;
  createdAt: string; // ISO
}

export function ActivityTimeline({
  activities,
  customerId,
  leadId,
}: {
  activities: ActivityItem[];
  customerId?: string;
  leadId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = { ...Object.fromEntries(fd), customerId, leadId };
    const res = await fetch("/api/activities", {
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

  async function remove(id: string) {
    if (!window.confirm("Aktivität wirklich löschen?")) return;
    const res = await fetch(`/api/activities/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  const shown = filter ? activities.filter((a) => a.type === filter) : activities;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">Aktivitäten</h3>
        {!open && <Button variant="ghost" onClick={() => setOpen(true)}>+ Aktivität</Button>}
      </div>

      {open && (
        <Card className="mb-4 p-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Typ">
                <Select name="type" defaultValue="NOTE">
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{LABELS[t]}</option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Betreff">
                  <Input name="subject" required autoFocus />
                </Field>
              </div>
            </div>
            <Field label="Notiz">
              <textarea
                name="body"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Speichern…" : "Erfassen"}</Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
            </div>
          </form>
        </Card>
      )}

      {/* Typ-Filter */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setFilter("")}
          className={`rounded-full px-2.5 py-1 font-medium ${filter === "" ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Alle
        </button>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-2.5 py-1 font-medium ${filter === t ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {ICONS[t]} {LABELS[t]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <Card className="p-6 text-center text-sm text-slate-400">Keine Aktivitäten.</Card>
      ) : (
        <ol className="relative space-y-3 border-l border-slate-200 pl-5">
          {shown.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[26px] flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs ring-1 ring-slate-200">
                {ICONS[a.type] ?? "•"}
              </span>
              <Card className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                        {LABELS[a.type] ?? a.type}
                      </span>
                      {a.subject}
                    </div>
                    {a.body && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-slate-400">
                      {new Date(a.createdAt).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <button
                      onClick={() => remove(a.id)}
                      title="Löschen"
                      className="rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
