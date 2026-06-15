"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

type Option = { id: string; name: string };

export interface TaskScalars {
  id: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  relatedCustomerId: string | null;
  relatedLeadId: string | null;
  dueAt: string; // yyyy-mm-dd oder ""
  status: string;
  priority: string;
}

const STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function TaskForm({
  users,
  customers,
  task,
  presetCustomerId,
  presetLeadId,
  compact = false,
  onDone,
}: {
  users: Option[];
  customers: Option[];
  task?: TaskScalars;
  presetCustomerId?: string;
  presetLeadId?: string;
  compact?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const isEdit = !!task;
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
    const res = await fetch(isEdit ? `/api/tasks/${task!.id}` : "/api/tasks", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      router.refresh();
      onDone?.();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  const v = (x: string | null | undefined) => x ?? "";

  return (
    <Card className="p-6">
      {!isEdit && !compact && (
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Neue Aufgabe</h3>
      )}
      <form onSubmit={submit} className="space-y-4">
        <Field label="Titel">
          <Input name="title" defaultValue={v(task?.title)} required />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fällig am">
            <Input name="dueAt" type="date" defaultValue={v(task?.dueAt)} />
          </Field>
          <Field label="Priorität">
            <Select name="priority" defaultValue={task?.priority ?? "MEDIUM"}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </Field>
          {isEdit && (
            <Field label="Status">
              <Select name="status" defaultValue={task?.status ?? "OPEN"}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Zuständig">
            <Select name="assignedToId" defaultValue={v(task?.assignedToId)}>
              <option value="">— niemand —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
          {!presetCustomerId && !presetLeadId && (
            <Field label="Bezug: Kunde (optional)">
              <Select name="relatedCustomerId" defaultValue={v(task?.relatedCustomerId)}>
                <option value="">— keiner —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
        {!compact && (
          <Field label="Beschreibung">
            <textarea
              name="description"
              defaultValue={v(task?.description)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </Field>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Speichern…" : isEdit ? "Speichern" : "Aufgabe anlegen"}
        </Button>
      </form>
    </Card>
  );
}
