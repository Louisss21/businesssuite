"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select } from "@/components/ui";

type ComponentOption = { id: string; name: string; sku: string };
interface BomItem { id: string; componentName: string; quantity: number }
interface Step {
  id: string;
  order: number;
  title: string;
  instruction: string;
  videoUrl: string | null;
  pdfUrl: string | null;
  requiresInput: boolean;
  inputLabel: string | null;
  bom: BomItem[];
}

export function ModelEditor({
  modelId,
  steps,
  components,
  products,
  productId,
  active,
}: {
  modelId: string;
  steps: Step[];
  components: ComponentOption[];
  products: { id: string; name: string }[];
  productId: string | null;
  active: boolean;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [prod, setProd] = useState(productId ?? "");
  const [act, setAct] = useState(active);

  const ids = steps.map((s) => s.id);

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true);
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else {
      const b = await res.json().catch(() => ({}));
      window.alert(b.error ?? "Aktion fehlgeschlagen");
    }
    return res.ok;
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    await call(`/api/table-models/${modelId}/steps/reorder`, "POST", { orderedIds: next });
  }

  async function addStep(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = await call(`/api/table-models/${modelId}/steps`, "POST", {
      ...Object.fromEntries(fd),
      requiresInput: fd.get("requiresInput") === "on",
    });
    if (ok) setAddOpen(false);
  }

  async function saveStep(stepId: string, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = await call(`/api/table-models/steps/${stepId}`, "PUT", {
      ...Object.fromEntries(fd),
      requiresInput: fd.get("requiresInput") === "on",
    });
    if (ok) setEditId(null);
  }

  return (
    <div className="space-y-4">
      {/* Punkt 2.6: Fertigerzeugnis-Zuordnung + Aktiv-Status */}
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fertigerzeugnis (wird bei Fertigstellung +1 eingebucht)">
            <Select
              value={prod}
              disabled={busy}
              onChange={(e) => {
                setProd(e.target.value);
                call(`/api/table-models/${modelId}`, "PUT", { productId: e.target.value });
              }}
            >
              <option value="">— kein Fertigerzeugnis —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-end gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={act}
              disabled={busy}
              onChange={(e) => {
                setAct(e.target.checked);
                call(`/api/table-models/${modelId}`, "PUT", { active: e.target.checked });
              }}
              className="mb-2 h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            Modell aktiv (für neue Produktionsaufträge auswählbar)
          </label>
        </div>
      </Card>

      {steps.map((s, i) => (
        <Card key={s.id} className="p-5">
          {editId === s.id ? (
            <form onSubmit={(e) => saveStep(s.id, e)} className="space-y-3">
              <Field label="Titel"><Input name="title" defaultValue={s.title} required /></Field>
              <Field label="Anleitung">
                <textarea
                  name="instruction"
                  defaultValue={s.instruction}
                  required
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Video-URL"><Input name="videoUrl" defaultValue={s.videoUrl ?? ""} /></Field>
                <Field label="PDF-URL"><Input name="pdfUrl" defaultValue={s.pdfUrl ?? ""} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="requiresInput" defaultChecked={s.requiresInput} className="h-4 w-4 rounded border-slate-300" />
                Pflicht-Eingabe erforderlich
              </label>
              <Field label="Bezeichnung der Eingabe"><Input name="inputLabel" defaultValue={s.inputLabel ?? ""} /></Field>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy}>Speichern</Button>
                <Button type="button" variant="ghost" onClick={() => setEditId(null)}>Abbrechen</Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">{s.order}. {s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.instruction}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                  {s.videoUrl && <span>🎬 Video</span>}
                  {s.pdfUrl && <span>📄 PDF</span>}
                  {s.requiresInput && <span>✏️ Eingabe: {s.inputLabel}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => move(i, -1)} disabled={busy || i === 0} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30" title="Nach oben">▲</button>
                <button onClick={() => move(i, 1)} disabled={busy || i === steps.length - 1} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700 disabled:opacity-30" title="Nach unten">▼</button>
                <button onClick={() => setEditId(s.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700" title="Bearbeiten">✎</button>
                <button onClick={() => call(`/api/table-models/steps/${s.id}/duplicate`, "POST")} disabled={busy} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700" title="Schritt duplizieren">⧉</button>
                <button
                  onClick={() => window.confirm("Schritt löschen?") && call(`/api/table-models/steps/${s.id}`, "DELETE")}
                  className="rounded-md p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"
                  title="Schritt löschen"
                >
                  🗑
                </button>
              </div>
            </div>
          )}

          {/* BOM */}
          <div className="mt-3 rounded-lg border border-slate-200">
            {s.bom.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">Keine Bauteile.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {s.bom.map((b) => (
                  <BomRow
                    key={b.id}
                    bom={b}
                    busy={busy}
                    onSave={(q) => call(`/api/table-models/bom/${b.id}`, "PATCH", { quantity: q })}
                    onRemove={() =>
                      window.confirm("Bauteil aus diesem Schritt entfernen?") &&
                      call(`/api/table-models/bom/${b.id}`, "DELETE")
                    }
                  />
                ))}
              </ul>
            )}
          </div>

          <BomAdder stepId={s.id} components={components} onAdd={(body) => call(`/api/table-models/steps/${s.id}/bom`, "POST", body)} busy={busy} />
        </Card>
      ))}

      {addOpen ? (
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Neuer Arbeitsschritt</h3>
          <form onSubmit={addStep} className="space-y-3">
            <Field label="Titel"><Input name="title" required /></Field>
            <Field label="Anleitung">
              <textarea name="instruction" required rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Video-URL (optional)"><Input name="videoUrl" /></Field>
              <Field label="PDF-URL (optional)"><Input name="pdfUrl" /></Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="requiresInput" className="h-4 w-4 rounded border-slate-300" />
              Pflicht-Eingabe erforderlich
            </label>
            <Field label="Bezeichnung der Eingabe (z. B. Seriennummer)"><Input name="inputLabel" /></Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>Schritt hinzufügen</Button>
              <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Abbrechen</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button onClick={() => setAddOpen(true)}>+ Arbeitsschritt</Button>
      )}
    </div>
  );
}

function BomRow({
  bom,
  onSave,
  onRemove,
  busy,
}: {
  bom: BomItem;
  onSave: (quantity: number) => Promise<boolean>;
  onRemove: () => void;
  busy: boolean;
}) {
  const [qty, setQty] = useState(String(bom.quantity));
  return (
    <li className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onBlur={() => {
            const q = Number(qty);
            if (Number.isInteger(q) && q >= 1 && q !== bom.quantity) onSave(q);
            else setQty(String(bom.quantity));
          }}
          disabled={busy}
          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right outline-none focus:border-brand-500"
        />
        <span>× {bom.componentName}</span>
      </span>
      <button onClick={onRemove} className="text-slate-300 hover:text-red-600" title="Entfernen">
        ✕
      </button>
    </li>
  );
}

function BomAdder({
  components,
  onAdd,
  busy,
}: {
  stepId: string;
  components: ComponentOption[];
  onAdd: (body: { componentId: string; quantity: number }) => Promise<boolean>;
  busy: boolean;
}) {
  const [componentId, setComponentId] = useState(components[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <Select value={componentId} onChange={(e) => setComponentId(e.target.value)} className="min-w-48 max-w-xs">
        {components.map((c) => (
          <option key={c.id} value={c.id}>{c.sku} · {c.name}</option>
        ))}
      </Select>
      <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-20" />
      <Button
        variant="ghost"
        onClick={() => componentId && onAdd({ componentId, quantity: Number(qty) || 1 })}
        disabled={busy || !componentId}
      >
        + Bauteil
      </Button>
    </div>
  );
}
