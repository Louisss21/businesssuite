"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Table, Th, Td, Input, Empty } from "@/components/ui";
import { useBulkSelection } from "@/components/bulk/useBulkSelection";
import {
  BulkToolbar,
  BulkChangeDialog,
  RowCheckbox,
  SelectAllCheckbox,
  runBulk,
  type BulkField,
} from "@/components/bulk/BulkUI";

export interface Column<T> {
  key: string;
  header: string;
  align?: "right";
  sort?: (row: T) => string | number;
  render: (row: T) => ReactNode;
}

export interface BulkConfig {
  deleteUrl?: string;
  updateUrl?: string;
  changeFields?: BulkField[];
  deleteNoun: string;
}

/**
 * Generische Tabelle mit Freitext-Filter und Spalten-Sort. Optional mit
 * Mehrfachauswahl + Bulk-Toolbar (B), wenn `getRowId` + `bulk` übergeben werden.
 */
export function DataTable<T>({
  rows,
  columns,
  filterText,
  empty = "Keine Einträge.",
  getRowId,
  bulk,
}: {
  rows: T[];
  columns: Column<T>[];
  filterText: (row: T) => string;
  empty?: string;
  getRowId?: (row: T) => string;
  bulk?: BulkConfig;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const view = useMemo(() => {
    let v = rows;
    const s = q.trim().toLowerCase();
    if (s) v = v.filter((r) => filterText(r).toLowerCase().includes(s));
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sort) {
      const sortFn = col.sort;
      v = [...v].sort((a, b) => {
        const av = sortFn(a);
        const bv = sortFn(b);
        return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      });
    }
    return v;
  }, [rows, q, sortKey, dir, columns, filterText]);

  const selectable = !!getRowId && !!bulk;
  const ids = useMemo(
    () => (getRowId ? view.map(getRowId) : []),
    [view, getRowId],
  );
  const sel = useBulkSelection(ids);

  function toggleSort(key: string) {
    if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setDir(1);
    }
  }

  async function doDelete() {
    if (!window.confirm(`${sel.count} ${bulk!.deleteNoun} wirklich löschen?`)) return;
    setBusy(true);
    const { ok, json } = await runBulk(bulk!.deleteUrl!, { ids: sel.selectedIds });
    setBusy(false);
    if (ok) {
      const d = json.data ?? {};
      const skipped = (d.skipped as { reason: string }[] | undefined) ?? [];
      setMsg(
        `${d.deleted ?? 0} gelöscht${skipped.length ? `, ${skipped.length} übersprungen (${skipped[0]?.reason ?? ""})` : ""}.`,
      );
      sel.clear();
      router.refresh();
    } else setMsg(json.error ?? "Löschen fehlgeschlagen");
  }

  async function applyChanges(changes: Record<string, string | number>) {
    setBusy(true);
    const { ok, json } = await runBulk(bulk!.updateUrl!, { ids: sel.selectedIds, changes });
    setBusy(false);
    if (ok) {
      setDialog(false);
      setMsg(`${json.data?.updated ?? 0} aktualisiert.`);
      sel.clear();
      router.refresh();
    } else setMsg(json.error ?? "Aktualisierung fehlgeschlagen");
  }

  return (
    <div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtern…"
        className="mb-3 max-w-xs"
      />

      {selectable && (
        <BulkToolbar
          count={sel.count}
          busy={busy}
          onClear={sel.clear}
          onDelete={bulk!.deleteUrl ? doDelete : undefined}
        >
          {bulk!.updateUrl && bulk!.changeFields && bulk!.changeFields.length > 0 && (
            <button
              onClick={() => setDialog(true)}
              disabled={busy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Ändern…
            </button>
          )}
        </BulkToolbar>
      )}
      {msg && <p className="mb-2 text-sm text-slate-500">{msg}</p>}

      <Table>
        <thead>
          <tr>
            {selectable && (
              <Th className="w-10">
                <SelectAllCheckbox
                  checked={sel.allSelected}
                  indeterminate={sel.someSelected}
                  onChange={sel.toggleAll}
                />
              </Th>
            )}
            {columns.map((c) => (
              <Th key={c.key} className={c.align === "right" ? "text-right" : ""}>
                {c.sort ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-1 hover:text-slate-700"
                  >
                    {c.header}
                    <span className="text-slate-400">
                      {sortKey === c.key ? (dir === 1 ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                ) : (
                  c.header
                )}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.map((r, i) => {
            const id = getRowId ? getRowId(r) : String(i);
            return (
              <tr key={id} className={selectable && sel.isSelected(id) ? "bg-surface-3" : undefined}>
                {selectable && (
                  <Td>
                    <RowCheckbox
                      checked={sel.isSelected(id)}
                      onToggle={(shift) => sel.toggle(id, i, shift)}
                    />
                  </Td>
                )}
                {columns.map((c) => (
                  <Td key={c.key} className={c.align === "right" ? "text-right" : ""}>
                    {c.render(r)}
                  </Td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </Table>
      {view.length === 0 && <Empty>{empty}</Empty>}

      {selectable && bulk!.updateUrl && bulk!.changeFields && (
        <BulkChangeDialog
          open={dialog}
          title={`${sel.count} Einträge ändern`}
          fields={bulk!.changeFields}
          busy={busy}
          onClose={() => setDialog(false)}
          onApply={applyChanges}
        />
      )}
    </div>
  );
}
