"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, Th, Td, Empty, Badge } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { useBulkSelection } from "./useBulkSelection";
import {
  BulkToolbar,
  BulkChangeDialog,
  RowCheckbox,
  SelectAllCheckbox,
  runBulk,
  type BulkField,
} from "./BulkUI";

export type BulkColumn = {
  key: string;
  header: string;
  type?: "text" | "link" | "badge";
  align?: "left" | "right";
  /** Bei type 'link': Ziel = hrefBase + row.id */
  hrefBase?: string;
};

export type BulkRow = { id: string } & Record<string, string | number | null>;

export type RowExtraLink = {
  hrefBase: string;
  /** optionales Suffix nach der ID, z. B. "/pdf?type=confirmation" */
  hrefSuffix?: string;
  icon: string;
  title: string;
  newTab?: boolean;
};

/**
 * Generische Liste mit Mehrfachauswahl (B). Spalten sind datengetrieben
 * (text/link/badge); die Seite reicht bereits formatierte, serialisierbare
 * Werte. Bestehende Einzel-Aktionen (✎ / 🗑) bleiben erhalten.
 */
export function BulkTable({
  rows,
  columns,
  editHrefBase,
  deleteUrlBase,
  labelKey,
  deleteNoun,
  rowExtraLinks = [],
  bulkDeleteUrl,
  bulkUpdateUrl,
  changeFields,
  emptyText = "Keine Einträge.",
}: {
  rows: BulkRow[];
  columns: BulkColumn[];
  editHrefBase?: string;
  deleteUrlBase?: string;
  labelKey: string;
  deleteNoun: string;
  rowExtraLinks?: RowExtraLink[];
  bulkDeleteUrl?: string;
  bulkUpdateUrl?: string;
  changeFields?: BulkField[];
  emptyText?: string;
}) {
  const router = useRouter();
  const ids = rows.map((r) => r.id);
  const sel = useBulkSelection(ids);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const hasActions = !!editHrefBase || !!deleteUrlBase || rowExtraLinks.length > 0;

  async function doDelete() {
    if (!window.confirm(`${sel.count} ${deleteNoun} wirklich löschen?`)) return;
    setBusy(true);
    const { ok, json } = await runBulk(bulkDeleteUrl!, { ids: sel.selectedIds });
    setBusy(false);
    if (ok) {
      const d = json.data ?? {};
      const skipped = (d.skipped as { reason: string }[] | undefined) ?? [];
      setMsg(
        `${d.deleted ?? 0} gelöscht${skipped.length ? `, ${skipped.length} übersprungen (${skipped[0]?.reason ?? ""})` : ""}.`,
      );
      sel.clear();
      router.refresh();
    } else {
      setMsg(json.error ?? "Löschen fehlgeschlagen");
    }
  }

  async function applyChanges(changes: Record<string, string | number>) {
    setBusy(true);
    const { ok, json } = await runBulk(bulkUpdateUrl!, { ids: sel.selectedIds, changes });
    setBusy(false);
    if (ok) {
      setDialog(false);
      setMsg(`${json.data?.updated ?? 0} aktualisiert.`);
      sel.clear();
      router.refresh();
    } else {
      setMsg(json.error ?? "Aktualisierung fehlgeschlagen");
    }
  }

  function renderCell(col: BulkColumn, row: BulkRow) {
    const v = row[col.key];
    if (col.type === "badge") return v ? <Badge value={String(v)} /> : <span className="text-slate-400">—</span>;
    if (col.type === "link") {
      if (v == null || v === "") return <span className="text-slate-400">—</span>;
      return (
        <Link href={`${col.hrefBase ?? ""}${row.id}`} className="font-medium text-brand-700">
          {String(v)}
        </Link>
      );
    }
    return v == null || v === "" ? <span className="text-slate-400">—</span> : String(v);
  }

  return (
    <>
      <BulkToolbar
        count={sel.count}
        busy={busy}
        onClear={sel.clear}
        onDelete={bulkDeleteUrl ? doDelete : undefined}
      >
        {bulkUpdateUrl && changeFields && changeFields.length > 0 && (
          <button
            onClick={() => setDialog(true)}
            disabled={busy}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Ändern…
          </button>
        )}
      </BulkToolbar>

      {msg && <p className="mb-2 text-sm text-slate-500">{msg}</p>}

      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <SelectAllCheckbox
                checked={sel.allSelected}
                indeterminate={sel.someSelected}
                onChange={sel.toggleAll}
              />
            </Th>
            {columns.map((c) => (
              <Th key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                {c.header}
              </Th>
            ))}
            {hasActions && <Th className="text-right">Aktionen</Th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={sel.isSelected(row.id) ? "bg-surface-3" : undefined}>
              <Td>
                <RowCheckbox
                  checked={sel.isSelected(row.id)}
                  onToggle={(shift) => sel.toggle(row.id, i, shift)}
                />
              </Td>
              {columns.map((c) => (
                <Td key={c.key} className={c.align === "right" ? "text-right" : undefined}>
                  {renderCell(c, row)}
                </Td>
              ))}
              {hasActions && (
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {rowExtraLinks.map((ex, k) => (
                      <a
                        key={k}
                        href={`${ex.hrefBase}${row.id}${ex.hrefSuffix ?? ""}`}
                        target={ex.newTab ? "_blank" : undefined}
                        rel={ex.newTab ? "noreferrer" : undefined}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                        title={ex.title}
                      >
                        {ex.icon}
                      </a>
                    ))}
                    {editHrefBase && (
                      <Link
                        href={`${editHrefBase}${row.id}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                        title="Bearbeiten"
                      >
                        ✎
                      </Link>
                    )}
                    {deleteUrlBase && (
                      <DeleteButton
                        url={`${deleteUrlBase}${row.id}`}
                        confirmText={`${deleteNoun.replace(/\(.*\)$/, "")} „${String(row[labelKey] ?? "")}" wirklich löschen?`}
                        iconOnly
                      />
                    )}
                  </div>
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <Empty>{emptyText}</Empty>}

      {bulkUpdateUrl && changeFields && (
        <BulkChangeDialog
          open={dialog}
          title={`${sel.count} Einträge ändern`}
          fields={changeFields}
          busy={busy}
          onClose={() => setDialog(false)}
          onApply={applyChanges}
        />
      )}
    </>
  );
}
