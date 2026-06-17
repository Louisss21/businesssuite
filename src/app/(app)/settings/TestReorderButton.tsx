"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

/** Punkt 2: Test-Nachbestellmail auslösen (prüft E-Mail-Versand + Lagerstatus). */
export function TestReorderButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/settings/test-reorder", { method: "POST" });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    const d = j.data ?? {};
    if (res.ok && d.sent) {
      setMsg({ ok: true, text: `Test-Mail an ${d.to} gesendet (${d.lowCount} Bauteil(e) unter Mindestbestand).` });
    } else if (res.ok && d.skipped) {
      setMsg({ ok: false, text: "Übersprungen: RESEND_API_KEY ist nicht gesetzt." });
    } else {
      setMsg({ ok: false, text: d.error || j.error || "Test fehlgeschlagen." });
    }
  }

  return (
    <Card className="mb-4 p-5">
      <h3 className="text-sm font-semibold text-slate-900">E-Mail / Nachbestellung testen</h3>
      <p className="mt-1 text-xs text-slate-500">
        Sendet eine Test-Nachbestellmail an die Einkaufsadresse (Einstellungen) und prüft damit den
        E-Mail-Versand. Benötigt eine gesetzte <code>RESEND_API_KEY</code>-Umgebungsvariable.
      </p>
      <div className="mt-3">
        <Button onClick={run} disabled={busy} variant="ghost">
          {busy ? "Sende…" : "Test-Nachbestellung senden"}
        </Button>
      </div>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
    </Card>
  );
}
