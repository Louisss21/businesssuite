"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

const CLASSIFICATIONS = ["", "A-Kunde", "B-Kunde", "C-Kunde", "VIP"];

export function TargetGroupBuilder({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [filter, setFilter] = useState({
    customerType: "",
    plzFrom: "",
    plzTo: "",
    classification: "",
    noPurchaseMonths: "",
  });
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: string, v: string) => {
    setFilter((f) => ({ ...f, [k]: v }));
    setCount(null);
    setMsg(null);
  };

  async function preview() {
    setBusy(true);
    const res = await fetch(`/api/campaigns/${campaignId}/recipients?preview=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filter),
    });
    setBusy(false);
    if (res.ok) setCount((await res.json()).data.count);
  }

  async function add() {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/campaigns/${campaignId}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filter),
    });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      setMsg(`${data.added} Empfänger hinzugefügt, ${data.skipped} bereits enthalten.`);
      router.refresh();
    }
  }

  return (
    <Card className="p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Zielgruppe aufbauen</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Kundentyp">
          <Select value={filter.customerType} onChange={(e) => set("customerType", e.target.value)}>
            <option value="">Alle</option>
            <option value="COMPANY">B2B (Firma)</option>
            <option value="PRIVATE">B2C (Privat)</option>
          </Select>
        </Field>
        <Field label="Klassifizierung">
          <Select value={filter.classification} onChange={(e) => set("classification", e.target.value)}>
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>{c || "Alle"}</option>
            ))}
          </Select>
        </Field>
        <Field label="Kein Kauf seit (Monaten)">
          <Input type="number" value={filter.noPurchaseMonths} onChange={(e) => set("noPurchaseMonths", e.target.value)} />
        </Field>
        <Field label="PLZ von">
          <Input value={filter.plzFrom} onChange={(e) => set("plzFrom", e.target.value)} placeholder="z. B. 10000" />
        </Field>
        <Field label="PLZ bis">
          <Input value={filter.plzTo} onChange={(e) => set("plzTo", e.target.value)} placeholder="z. B. 19999" />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" onClick={preview} disabled={busy}>
          Vorschau
        </Button>
        {count !== null && (
          <span className="text-sm text-slate-600">
            <strong>{count}</strong> passende Kunden
          </span>
        )}
        <Button type="button" onClick={add} disabled={busy}>
          {busy ? "…" : "Empfänger hinzufügen"}
        </Button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </Card>
  );
}
