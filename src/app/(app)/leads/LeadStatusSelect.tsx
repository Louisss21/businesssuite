"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { leadStatuses } from "@/modules/crm/lead.schema";

const LABELS: Record<string, string> = {
  NEW: "Neu",
  CONTACTED: "Kontaktiert",
  QUALIFIED: "Qualifiziert",
  WON: "Gewonnen",
  LOST: "Verloren",
};

const COLOR: Record<string, string> = {
  NEW: "#9A9AA2",
  CONTACTED: "#60A5FA",
  QUALIFIED: "#60A5FA",
  WON: "#34D399",
  LOST: "#F87171",
};

/**
 * A1.2: Lead-Status direkt in der Liste änderbar. Speichert sofort per
 * PATCH /api/leads/[id] (nur das Statusfeld) und aktualisiert die Liste.
 */
export function LeadStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    const prev = value;
    setValue(next);
    setBusy(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setValue(prev); // bei Fehler zurückrollen
  }

  const color = COLOR[value] ?? "#9A9AA2";
  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="rounded-badge border px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-wider outline-none disabled:opacity-50"
      style={{ color, backgroundColor: `${color}24`, borderColor: `${color}40` }}
    >
      {leadStatuses.map((s) => (
        <option key={s} value={s} style={{ color: "#fff", background: "#16161a" }}>
          {LABELS[s] ?? s}
        </option>
      ))}
    </select>
  );
}
