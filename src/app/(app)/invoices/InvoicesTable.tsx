"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, Th, Td, Empty } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { InvoiceStatusSelect } from "./InvoiceStatusSelect";
import { useBulkSelection } from "@/components/bulk/useBulkSelection";
import {
  BulkToolbar,
  BulkChangeDialog,
  RowCheckbox,
  SelectAllCheckbox,
  runBulk,
  type BulkField,
} from "@/components/bulk/BulkUI";

export type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  customer: string;
  issueDate: string;
  dueDate: string;
  period: string;
  gross: string;
  status: string;
};

const STATUS_FIELDS: BulkField[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["OPEN", "PAID", "OVERDUE", "CANCELLED"].map((s) => ({ value: s, label: s })),
  },
];

export function InvoicesTable({ rows }: { rows: InvoiceRow[] }) {
  const router = useRouter();
  const ids = rows.map((r) => r.id);
  const sel = useBulkSelection(ids);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function doDelete() {
    if (!window.confirm(`${sel.count} Rechnung(en) löschen? Bezahlte werden übersprungen (Storno statt Löschen).`)) return;
    setBusy(true);
    const { ok, json } = await runBulk("/api/invoices/bulk-delete", { ids: sel.selectedIds });
    setBusy(false);
    if (ok) {
      const d = json.data ?? {};
      const skipped = (d.skipped as { reason: string }[] | undefined) ?? [];
      setMsg(`${d.deleted ?? 0} gelöscht${skipped.length ? `, ${skipped.length} übersprungen (bezahlt)` : ""}.`);
      sel.clear();
      router.refresh();
    } else setMsg(json.error ?? "Löschen fehlgeschlagen");
  }

  async function applyChanges(changes: Record<string, string | number>) {
    setBusy(true);
    const { ok, json } = await runBulk("/api/invoices/bulk-update", { ids: sel.selectedIds, changes });
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
      <BulkToolbar count={sel.count} busy={busy} onClear={sel.clear} onDelete={doDelete}>
        <button
          onClick={() => setDialog(true)}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Status ändern…
        </button>
      </BulkToolbar>

      {msg && <p className="mb-2 text-sm text-slate-500">{msg}</p>}

      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <SelectAllCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} />
            </Th>
            <Th>Nummer</Th>
            <Th>Kunde</Th>
            <Th>Datum</Th>
            <Th>Fällig</Th>
            <Th>Periode</Th>
            <Th className="text-right">Brutto</Th>
            <Th>Status</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv, i) => (
            <tr key={inv.id} className={sel.isSelected(inv.id) ? "bg-surface-3" : undefined}>
              <Td>
                <RowCheckbox checked={sel.isSelected(inv.id)} onToggle={(shift) => sel.toggle(inv.id, i, shift)} />
              </Td>
              <Td>
                <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700">
                  {inv.invoiceNumber}
                </Link>
              </Td>
              <Td>{inv.customer}</Td>
              <Td>{inv.issueDate}</Td>
              <Td>{inv.dueDate}</Td>
              <Td className="text-slate-500">{inv.period}</Td>
              <Td className="text-right">{inv.gross}</Td>
              <Td>
                <InvoiceStatusSelect id={inv.id} status={inv.status} />
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Ansehen"
                  >
                    ✎
                  </Link>
                  <DeleteButton
                    url={`/api/invoices/${inv.id}`}
                    confirmText={`Rechnung ${inv.invoiceNumber} wirklich löschen? (Hinweis: i. d. R. stornieren statt löschen.)`}
                    iconOnly
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <Empty>Keine Rechnungen. Erstelle eine aus einer Bestellung.</Empty>}

      <BulkChangeDialog
        open={dialog}
        title={`${sel.count} Rechnung(en) ändern`}
        fields={STATUS_FIELDS}
        busy={busy}
        onClose={() => setDialog(false)}
        onApply={applyChanges}
      />
    </>
  );
}
