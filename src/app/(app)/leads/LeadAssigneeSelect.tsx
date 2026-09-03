"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Zuständigkeit direkt in der Leads-Liste änderbar (wie LeadStatusSelect).
 * Speichert sofort per PATCH /api/leads/[id] (nur assignedUserId) und
 * aktualisiert die Liste; bei Fehler wird zurückgerollt.
 */
export function LeadAssigneeSelect({
  id,
  assignedUserId,
  assignedName,
  users,
}: {
  id: string;
  assignedUserId: string | null;
  assignedName: string | null;
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(assignedUserId ?? "");
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setBusy(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedUserId: next }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setValue(prev); // bei Fehler zurückrollen
  }

  // Zugewiesener Nutzer, der nicht (mehr) in der Auswahl ist (z. B. inaktiv):
  // als eigene Option anzeigen, damit die Zuweisung sichtbar bleibt.
  const known = users.some((u) => u.id === value);

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className={`max-w-[160px] truncate rounded-badge border border-line bg-transparent px-2 py-1 text-sm outline-none disabled:opacity-50 ${
        value ? "text-slate-700" : "text-slate-400"
      }`}
    >
      <option value="" style={{ color: "var(--text)", background: "var(--surface-2)" }}>
        —
      </option>
      {!known && value && (
        <option value={value} style={{ color: "var(--text)", background: "var(--surface-2)" }}>
          {assignedName ?? "Unbekannt"}
        </option>
      )}
      {users.map((u) => (
        <option
          key={u.id}
          value={u.id}
          style={{ color: "var(--text)", background: "var(--surface-2)" }}
        >
          {u.name}
        </option>
      ))}
    </select>
  );
}
