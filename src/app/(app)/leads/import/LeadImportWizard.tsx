"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Select } from "@/components/ui";

type Row = Record<string, string>;

const FIELDS = [
  { key: "title", label: "Titel / Bezeichnung" },
  { key: "firstName", label: "Vorname" },
  { key: "lastName", label: "Nachname" },
  { key: "email", label: "E-Mail" },
  { key: "phone", label: "Telefon" },
  { key: "company", label: "Firma" },
  { key: "source", label: "Quelle" },
] as const;

const GUESS: Record<string, string[]> = {
  title: ["titel", "title", "bezeichnung", "betreff"],
  firstName: ["vorname", "first", "firstname"],
  lastName: ["nachname", "last", "lastname", "name"],
  email: ["email", "e-mail", "mail"],
  phone: ["telefon", "phone", "tel", "mobil"],
  company: ["firma", "company", "unternehmen"],
  source: ["quelle", "source", "herkunft"],
};

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const f of FIELDS) {
    const hit = headers.find((h) =>
      GUESS[f.key].some((g) => h.toLowerCase().trim().includes(g)),
    );
    if (hit) map[f.key] = hit;
  }
  return map;
}

export function LeadImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [check, setCheck] = useState<{ total: number; created: number; duplicates: number } | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    setError(null);
    try {
      let data: Row[] = [];
      if (file.name.toLowerCase().endsWith(".csv")) {
        const Papa = (await import("papaparse")).default;
        const text = await file.text();
        const parsed = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
        data = (parsed.data as Row[]).map((r) => normalize(r));
      } else {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
        data = json.map((r) => normalize(r));
      }
      if (data.length === 0) {
        setError("Keine Datenzeilen gefunden.");
        return;
      }
      const hdrs = Object.keys(data[0]);
      setHeaders(hdrs);
      setRows(data);
      setMapping(autoMap(hdrs));
      setStep(2);
    } catch {
      setError("Datei konnte nicht gelesen werden.");
    }
  }

  function normalize(r: Row): Row {
    const out: Row = {};
    for (const k of Object.keys(r)) out[k] = r[k] == null ? "" : String(r[k]);
    return out;
  }

  function mappedLeads(): Row[] {
    return rows.map((r) => {
      const o: Row = {};
      for (const f of FIELDS) {
        const col = mapping[f.key];
        o[f.key] = col ? (r[col] ?? "").trim() : "";
      }
      return o;
    });
  }

  async function runImport(dryRun: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/leads/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leads: mappedLeads(), mode, dryRun }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Import fehlgeschlagen");
      return;
    }
    const { data } = await res.json();
    if (dryRun) {
      setCheck({ total: data.total, created: data.created, duplicates: data.duplicates });
      setStep(3);
    } else {
      setResult({ created: data.created, updated: data.updated, skipped: data.skipped });
      setStep(4);
      router.refresh();
    }
  }

  const preview = mappedLeads().slice(0, 3);

  return (
    <div className="space-y-4">
      <Stepper step={step} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {step === 1 && (
        <Card className="p-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">1. Datei hochladen</h3>
          <p className="mb-4 text-sm text-slate-500">CSV- oder Excel-Datei (.csv, .xlsx) mit Kopfzeile.</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">
            2. Spalten zuordnen <span className="text-slate-400">({rows.length} Zeilen)</span>
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Select
                  value={mapping[f.key] ?? ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                >
                  <option value="">— ignorieren —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>

          <h4 className="mb-2 mt-6 text-xs font-semibold uppercase text-slate-400">Vorschau (erste 3 Zeilen)</h4>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {FIELDS.map((f) => (
                    <th key={f.key} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {FIELDS.map((f) => (
                      <td key={f.key} className="px-3 py-2 text-slate-700">{r[f.key] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={() => runImport(true)} disabled={busy}>
              {busy ? "Prüfe…" : "Weiter zur Dublettenprüfung"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>Zurück</Button>
          </div>
        </Card>
      )}

      {step === 3 && check && (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">3. Dublettenprüfung</h3>
          <ul className="mb-4 space-y-1 text-sm text-slate-700">
            <li>Zeilen gesamt: <strong>{check.total}</strong></li>
            <li>Neue Leads: <strong className="text-green-600">{check.created}</strong></li>
            <li>Duplikate (per E-Mail): <strong className="text-amber-600">{check.duplicates}</strong></li>
          </ul>
          <Field label="Umgang mit Duplikaten">
            <Select value={mode} onChange={(e) => setMode(e.target.value as "skip" | "update")}>
              <option value="skip">Überspringen</option>
              <option value="update">Aktualisieren</option>
            </Select>
          </Field>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => runImport(false)} disabled={busy}>
              {busy ? "Importiere…" : "Import starten"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(2)}>Zurück</Button>
          </div>
        </Card>
      )}

      {step === 4 && result && (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">4. Fertig ✅</h3>
          <ul className="mb-4 space-y-1 text-sm text-slate-700">
            <li>Neu angelegt: <strong className="text-green-600">{result.created}</strong></li>
            <li>Aktualisiert: <strong>{result.updated}</strong></li>
            <li>Übersprungen: <strong>{result.skipped}</strong></li>
          </ul>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/leads")}>Zu den Leads</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setStep(1);
                setRows([]);
                setHeaders([]);
                setResult(null);
                setCheck(null);
              }}
            >
              Weiteren Import
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const steps = ["Hochladen", "Zuordnen", "Prüfen", "Fertig"];
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {steps.map((s, i) => (
        <span
          key={s}
          className={`rounded-full px-3 py-1 font-medium ${
            step === i + 1
              ? "bg-brand-600 text-white"
              : step > i + 1
                ? "bg-green-100 text-green-700"
                : "bg-white text-slate-500 ring-1 ring-slate-200"
          }`}
        >
          {i + 1}. {s}
        </span>
      ))}
    </div>
  );
}
