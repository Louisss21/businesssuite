"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";

/** Punkt 2.2: Seriennummer jederzeit (auch nach Abschluss) ändern. */
export function SerialEditor({ orderId, current }: { orderId: string; current: string | null }) {
  const router = useRouter();
  const [serial, setSerial] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/production/${orderId}/serial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Seriennummer gespeichert." });
      router.refresh();
    } else {
      setMsg({ ok: false, text: j.error ?? "Speichern fehlgeschlagen" });
    }
  }

  return (
    <Card className="mb-4 p-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-slate-600">
          <span className="mb-1 block">Seriennummer (nachträglich änderbar)</span>
          <Input
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            className="w-56"
            placeholder="z. B. SUS-2026-0001"
          />
        </label>
        <Button onClick={save} disabled={busy || !serial.trim()}>
          {busy ? "…" : "Speichern"}
        </Button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
    </Card>
  );
}
