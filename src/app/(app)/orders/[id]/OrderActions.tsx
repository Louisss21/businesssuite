"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";

const STATUSES = ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

export function OrderActions({
  id,
  status,
  hasInvoice,
  canInvoice,
}: {
  id: string;
  status: string;
  hasInvoice: boolean;
  canInvoice: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(value: string) {
    setBusy(true);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    setBusy(false);
    router.refresh();
  }

  async function createInvoice() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id }),
    });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/invoices/${data.id}`);
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Fehler beim Erstellen");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Select
        defaultValue={status}
        className="w-44"
        disabled={busy}
        onChange={(e) => changeStatus(e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {!hasInvoice && (
        <Button onClick={createInvoice} disabled={busy || !canInvoice}>
          Rechnung erstellen
        </Button>
      )}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
