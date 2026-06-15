"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Table, Th, Td, Input, Empty } from "@/components/ui";

export interface Column<T> {
  key: string;
  header: string;
  align?: "right";
  sort?: (row: T) => string | number;
  render: (row: T) => ReactNode;
}

/**
 * Generische Tabelle mit Freitext-Filter und klickbarem Spalten-Sort.
 * Spaltendefinitionen (inkl. render) liegen im jeweiligen Client-Wrapper.
 */
export function DataTable<T>({
  rows,
  columns,
  filterText,
  empty = "Keine Einträge.",
}: {
  rows: T[];
  columns: Column<T>[];
  filterText: (row: T) => string;
  empty?: string;
}) {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);

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

  function toggleSort(key: string) {
    if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setDir(1);
    }
  }

  return (
    <div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtern…"
        className="mb-3 max-w-xs"
      />
      <Table>
        <thead>
          <tr>
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
          {view.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <Td key={c.key} className={c.align === "right" ? "text-right" : ""}>
                  {c.render(r)}
                </Td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      {view.length === 0 && <Empty>{empty}</Empty>}
    </div>
  );
}
