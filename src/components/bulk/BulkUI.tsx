"use client";

import { useEffect, useRef, useState } from "react";

/** Kopf-Checkbox mit Tri-State (alle / teilweise / keine). */
export function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label="Alle auswählen"
      className="h-4 w-4 cursor-pointer accent-brand-600"
    />
  );
}

/** Zeilen-Checkbox. Stoppt Klick-Propagation, damit keine Navigation auslöst. */
export function RowCheckbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: (shift: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e.shiftKey);
      }}
      onChange={() => {}}
      aria-label="Zeile auswählen"
      className="h-4 w-4 cursor-pointer accent-brand-600"
    />
  );
}

/** Sticky Aktionsleiste, sichtbar sobald ≥1 Eintrag gewählt ist. */
export function BulkToolbar({
  count,
  busy,
  onClear,
  onDelete,
  deleteLabel = "Löschen",
  children,
}: {
  count: number;
  busy?: boolean;
  onClear: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  children?: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-xl border border-brand-600/40 bg-surface-3 px-4 py-2.5 shadow-lg">
      <span className="text-sm font-medium text-slate-900">{count} ausgewählt</span>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={busy}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {deleteLabel}
          </button>
        )}
      </div>
      <button
        onClick={onClear}
        disabled={busy}
        className="ml-auto text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
      >
        Auswahl aufheben
      </button>
    </div>
  );
}

export type BulkField =
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "number" }
  | { key: string; label: string; type: "text" };

/**
 * Generischer Massenbearbeitungs-Dialog. Nur Felder mit gesetztem Wert werden
 * an onApply übergeben (leere Felder bleiben unverändert).
 */
export function BulkChangeDialog({
  open,
  title,
  fields,
  busy,
  onClose,
  onApply,
}: {
  open: boolean;
  title: string;
  fields: BulkField[];
  busy?: boolean;
  onClose: () => void;
  onApply: (changes: Record<string, string | number>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) setValues({});
  }, [open]);
  if (!open) return null;

  function apply() {
    const changes: Record<string, string | number> = {};
    for (const f of fields) {
      const v = values[f.key];
      if (v === undefined || v === "") continue;
      changes[f.key] = f.type === "number" ? Number(v) : v;
    }
    onApply(changes);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-base font-semibold text-slate-900">{title}</h3>
        <div className="space-y-3">
          {fields.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">{f.label}</span>
              {f.type === "select" ? (
                <select
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                >
                  <option value="">— unverändert —</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === "number" ? "number" : "text"}
                  value={values[f.key] ?? ""}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              )}
            </label>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Abbrechen
          </button>
          <button
            onClick={apply}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? "Übernehmen…" : "Übernehmen"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Helfer: Bulk-Request abschicken, JSON zurückgeben. */
export async function runBulk(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, json };
}
