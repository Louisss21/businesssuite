"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEAD_STATUS_OPTIONS } from "@/modules/crm/lead.schema";
import { BADGE_COLORS } from "@/components/ui";

// Labels und Reihenfolge kommen zentral aus lead.schema.ts,
// Farbtöne aus ui.tsx (ein Farbton je Status, Theme-abhängig).

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

  const color = BADGE_COLORS[value] ?? "var(--st-grey)";
  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className="status-select rounded-badge border px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-wider outline-none disabled:opacity-50"
      style={{ "--sc": color } as React.CSSProperties}
    >
      {LEAD_STATUS_OPTIONS.map((s) => (
        <option
          key={s.value}
          value={s.value}
          style={{ color: "var(--text)", background: "var(--surface-2)" }}
        >
          {s.label}
        </option>
      ))}
    </select>
  );
}
