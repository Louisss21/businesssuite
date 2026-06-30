"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input } from "@/components/ui";

const ROLES: { key: string; label: string }[] = [
  { key: "ADMIN", label: "Administrator" },
  { key: "SALES", label: "Vertrieb" },
  { key: "MARKETING", label: "Marketing" },
  { key: "WAREHOUSE", label: "Lager" },
  { key: "ACCOUNTING", label: "Buchhaltung" },
];

/** Abteilungs-/Rollen-spezifische PDF-Fußzeilen. Leer = globale Fußzeile. */
export function RoleFootersForm({
  initial,
  globalFooter,
}: {
  initial: Record<string, string>;
  globalFooter: string;
}) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const r of ROLES) v[r.key] = initial[r.key] ?? "";
    return v;
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/settings/role-footers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ footers: vals }),
    });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Gespeichert." });
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setMsg({ ok: false, text: b.error ?? "Speichern fehlgeschlagen" });
    }
  }

  return (
    <Card className="mb-4 p-5">
      <h3 className="text-sm font-semibold text-slate-900">PDF-Fußzeile je Abteilung</h3>
      <p className="mt-1 text-xs text-slate-500">
        Die Fußzeile der erzeugten Dokumente richtet sich nach der Abteilung des Erstellers.
        Leer lassen → es gilt die globale Fußzeile (aktuell: „{globalFooter || "—"}").
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLES.map((r) => (
          <Field key={r.key} label={r.label}>
            <Input
              value={vals[r.key]}
              onChange={(e) => setVals((v) => ({ ...v, [r.key]: e.target.value }))}
              placeholder={globalFooter || "z. B. IT Meeting"}
            />
          </Field>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={save} disabled={busy}>{busy ? "Speichern…" : "Fußzeilen speichern"}</Button>
        {msg && <span className={`text-sm ${msg.ok ? "text-green-600" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </Card>
  );
}
