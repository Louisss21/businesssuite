"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, Th, Td, Input, Button } from "@/components/ui";
import { useBulkSelection } from "@/components/bulk/useBulkSelection";
import {
  BulkToolbar,
  BulkChangeDialog,
  RowCheckbox,
  SelectAllCheckbox,
  runBulk,
} from "@/components/bulk/BulkUI";

export interface ComponentRow {
  id: string;
  sku: string;
  name: string;
  unit: string;
  stockQty: number;
  minStock: number;
}

function levelBadge(stockQty: number, minStock: number) {
  const cls =
    stockQty <= 0
      ? "bg-red-100 text-red-700"
      : stockQty <= minStock
        ? "bg-amber-100 text-amber-700"
        : "bg-green-100 text-green-700";
  const label = stockQty <= 0 ? "Leer" : stockQty <= minStock ? "Niedrig" : "OK";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function Row({
  c,
  selected,
  onToggle,
}: {
  c: ComponentRow;
  selected: boolean;
  onToggle: (shift: boolean) => void;
}) {
  const router = useRouter();
  const [minStock, setMinStock] = useState(String(c.minStock));
  const [savingMin, setSavingMin] = useState(false);
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("Wareneingang");
  const [busy, setBusy] = useState(false);

  async function saveMin() {
    if (Number(minStock) === c.minStock) return;
    setSavingMin(true);
    await fetch(`/api/components/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minStock: Number(minStock) }),
    });
    setSavingMin(false);
    router.refresh();
  }

  async function book() {
    if (!delta || Number(delta) === 0) return;
    setBusy(true);
    const res = await fetch(`/api/components/${c.id}/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta: Number(delta), reason }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setDelta("");
      router.refresh();
    }
  }

  return (
    <>
      <tr className={selected ? "bg-surface-3" : undefined}>
        <Td>
          <RowCheckbox checked={selected} onToggle={onToggle} />
        </Td>
        <Td className="font-mono text-xs text-slate-500">{c.sku}</Td>
        <Td className="font-medium">
          <Link href={`/inventory/${c.id}`} className="text-brand-700">
            {c.name}
          </Link>
        </Td>
        <Td className="text-right">{c.stockQty} {c.unit}</Td>
        <Td className="text-right">
          <input
            type="number"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            onBlur={saveMin}
            className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm outline-none focus:border-brand-500"
            disabled={savingMin}
          />
        </Td>
        <Td>{levelBadge(c.stockQty, c.minStock)}</Td>
        <Td className="text-right">
          <button onClick={() => setOpen((o) => !o)} className="text-sm font-medium text-brand-700">
            Buchen
          </button>
        </Td>
      </tr>
      {open && (
        <tr>
          <td colSpan={7} className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-slate-600">
                <span className="mb-1 block">Menge (+ Zugang / − Abgang)</span>
                <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} className="w-32" />
              </label>
              <label className="text-xs text-slate-600">
                <span className="mb-1 block">Grund</span>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} className="w-56" />
              </label>
              <Button onClick={book} disabled={busy}>{busy ? "…" : "Buchen"}</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function InventoryManager({ components }: { components: ComponentRow[] }) {
  const router = useRouter();
  const ids = components.map((c) => c.id);
  const sel = useBulkSelection(ids);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function applyChanges(changes: Record<string, string | number>) {
    setBusy(true);
    const { ok, json } = await runBulk("/api/components/bulk-update", {
      ids: sel.selectedIds,
      changes,
    });
    setBusy(false);
    if (ok) {
      setDialog(false);
      setMsg(`${json.data?.updated ?? 0} aktualisiert.`);
      sel.clear();
      router.refresh();
    } else setMsg(json.error ?? "Aktualisierung fehlgeschlagen");
  }

  return (
    <>
      <BulkToolbar count={sel.count} busy={busy} onClear={sel.clear}>
        <button
          onClick={() => setDialog(true)}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Mindestbestand setzen…
        </button>
      </BulkToolbar>
      {msg && <p className="mb-2 text-sm text-slate-500">{msg}</p>}

      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <SelectAllCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} />
            </Th>
            <Th>SKU</Th>
            <Th>Name</Th>
            <Th className="text-right">Bestand</Th>
            <Th className="text-right">Mindestbestand</Th>
            <Th>Status</Th>
            <Th className="text-right">Wareneingang</Th>
          </tr>
        </thead>
        <tbody>
          {components.map((c, i) => (
            <Row
              key={c.id}
              c={c}
              selected={sel.isSelected(c.id)}
              onToggle={(shift) => sel.toggle(c.id, i, shift)}
            />
          ))}
        </tbody>
      </Table>

      <BulkChangeDialog
        open={dialog}
        title={`Mindestbestand für ${sel.count} Bauteil(e) setzen`}
        fields={[{ key: "minStock", label: "Mindestbestand", type: "number" }]}
        busy={busy}
        onClose={() => setDialog(false)}
        onApply={applyChanges}
      />
    </>
  );
}
