"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

export interface BomLine {
  name: string;
  unit: string;
  quantity: number;
  stock: number;
}
export interface StepData {
  order: number;
  title: string;
  instruction: string;
  videoUrl: string | null;
  pdfUrl: string | null;
  requiresInput: boolean;
  inputLabel: string | null;
  bom: BomLine[];
}
export interface OrderData {
  id: string;
  status: string;
  currentStep: number;
  serialNumber: string | null;
}

export function ProductionAssistant({
  order,
  steps,
  modelName,
  productName,
}: {
  order: OrderData;
  steps: StepData[];
  modelName: string;
  productName: string | null;
}) {
  const router = useRouter();
  const total = steps.length;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [serial, setSerial] = useState(order.serialNumber ?? "");
  const [savingSerial, setSavingSerial] = useState(false);

  if (order.status === "COMPLETED") {
    return (
      <Card className="p-8 text-center">
        <div className="text-3xl">✅</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Tisch fertiggestellt</h2>
        <p className="mt-1 text-slate-600">{modelName}</p>
        <p className="mt-3 text-sm">
          Seriennummer: <strong className="font-mono">{order.serialNumber ?? "—"}</strong>
        </p>
        {productName && (
          <p className="mt-1 text-sm text-slate-500">Fertigerzeugnis „{productName}" wurde eingebucht (+1).</p>
        )}
        <div className="mt-6">
          <Button onClick={() => router.push("/production")}>Zur Übersicht</Button>
        </div>
      </Card>
    );
  }

  if (order.status === "CANCELLED") {
    return (
      <Card className="p-8 text-center text-slate-600">
        <div className="text-3xl">🚫</div>
        <h2 className="mt-2 text-xl font-semibold text-slate-900">Produktion abgebrochen</h2>
        <div className="mt-6">
          <Button variant="ghost" onClick={() => router.push("/production")}>Zur Übersicht</Button>
        </div>
      </Card>
    );
  }

  const step = steps.find((s) => s.order === order.currentStep);
  if (!step) {
    return <Card className="p-6 text-slate-500">Kein offener Schritt.</Card>;
  }

  const serialMissing = step.requiresInput && !order.serialNumber;
  const insufficient = step.bom.filter((b) => b.stock < b.quantity);

  async function saveSerial() {
    setSavingSerial(true);
    setError(null);
    const res = await fetch(`/api/production/${order.id}/serial`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial }),
    });
    setSavingSerial(false);
    if (res.ok) router.refresh();
    else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  async function completeStep() {
    setBusy(true);
    setError(null);
    setInfo(null);
    const res = await fetch(`/api/production/${order.id}/complete-step`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      if (data.lowStock?.length) {
        setInfo(`${data.lowStock.length} Bauteil(e) unter Mindestbestand → Nachbestellung ausgelöst.`);
      }
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Schritt konnte nicht abgeschlossen werden");
    }
  }

  async function cancel() {
    if (!window.confirm("Produktion wirklich abbrechen? Bereits entnommene Teile bleiben ausgebucht.")) return;
    setBusy(true);
    const res = await fetch(`/api/production/${order.id}/cancel`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const pct = Math.round(((order.currentStep - 1) / total) * 100);

  return (
    <div className="space-y-4">
      {/* Fortschritt */}
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            Schritt {order.currentStep} von {total}
          </span>
          <span className="text-slate-400">{modelName}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {step.order}. {step.title}
          </h2>
          {(step.videoUrl || step.pdfUrl) && (
            <Button variant="ghost" onClick={() => setShowMore(true)}>ℹ Mehr erfahren</Button>
          )}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{step.instruction}</p>

        {/* Bauteil-Entnahme */}
        {step.bom.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">Bauteil-Entnahme</h3>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {step.bom.map((b, i) => {
                const ok = b.stock >= b.quantity;
                return (
                  <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-800">
                      <strong>{b.quantity}×</strong> {b.name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      Bestand: {b.stock} {b.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
            {insufficient.length > 0 && (
              <p className="mt-2 text-sm font-medium text-red-600">
                ⚠ {insufficient.length} Bauteil(e) reichen nicht – Bestand wird negativ. Entnahme trotzdem möglich, Nachbestellung wird ausgelöst.
              </p>
            )}
          </div>
        )}

        {/* Pflicht-Eingabe (z. B. Seriennummer) */}
        {step.requiresInput && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3">
            <label className="block text-sm font-medium text-slate-700">
              {step.inputLabel ?? "Eingabe"} (Pflicht)
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                placeholder="z. B. SUS-2026-0001"
              />
              <Button onClick={saveSerial} disabled={savingSerial || !serial.trim()}>
                {savingSerial ? "…" : order.serialNumber ? "Aktualisieren" : "Speichern"}
              </Button>
            </div>
            {order.serialNumber && (
              <p className="mt-1 text-xs text-green-600">Gespeichert: {order.serialNumber}</p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {info && <p className="mt-3 text-sm text-amber-600">{info}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={completeStep} disabled={busy || serialMissing}>
            {order.currentStep === total ? "Fertigstellen ✓" : "Schritt abschließen / Weiter →"}
          </Button>
          <Button variant="danger" onClick={cancel} disabled={busy}>
            Produktion abbrechen
          </Button>
        </div>
        {serialMissing && (
          <p className="mt-2 text-xs text-amber-600">
            Bitte zuerst {step.inputLabel ?? "die Eingabe"} speichern, um fortzufahren.
          </p>
        )}
      </Card>

      {/* "Mehr erfahren"-Modal */}
      {showMore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowMore(false)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{step.title} – Mehr erfahren</h3>
              <button onClick={() => setShowMore(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">✕</button>
            </div>
            {step.videoUrl && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Video</p>
                <video src={step.videoUrl} controls className="w-full rounded-lg" />
              </div>
            )}
            {step.pdfUrl && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-400">Zeichnung (PDF)</p>
                <iframe src={step.pdfUrl} className="h-[60vh] w-full rounded-lg border border-slate-200" />
                <a href={step.pdfUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-brand-700">
                  PDF in neuem Tab öffnen ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
