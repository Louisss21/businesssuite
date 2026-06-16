"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** A6.1: Status einer Eingangsrechnung umschalten (OPEN ↔ PAID). */
export function IncomingStatusToggle({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const paid = status === "PAID";

  async function toggle() {
    setBusy(true);
    const res = await fetch(`/api/incoming-invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: paid ? "OPEN" : "PAID" }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const color = paid ? "#34D399" : "#F07D00";
  return (
    <button
      onClick={toggle}
      disabled={busy}
      title="Status umschalten"
      className="rounded-badge border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider disabled:opacity-50"
      style={{ color, backgroundColor: `${color}24`, borderColor: `${color}40` }}
    >
      {paid ? "Bezahlt" : "Offen"}
    </button>
  );
}
