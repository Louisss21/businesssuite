"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, Th, Td, Empty } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { LeadStatusSelect } from "./LeadStatusSelect";
import { useBulkSelection } from "@/components/bulk/useBulkSelection";
import {
  BulkToolbar,
  BulkChangeDialog,
  RowCheckbox,
  SelectAllCheckbox,
  runBulk,
  type BulkField,
} from "@/components/bulk/BulkUI";

export type LeadRow = {
  id: string;
  title: string;
  status: string;
  score: number;
  contact: string;
  customerName: string | null;
};

const STATUS_OPTIONS = [
  { value: "NEW", label: "Neu" },
  { value: "CONTACTED", label: "Kontaktiert" },
  { value: "QUALIFIED", label: "Qualifiziert" },
  { value: "WON", label: "Gewonnen" },
  { value: "LOST", label: "Verloren" },
];

export function LeadsTable({
  rows,
  users,
}: {
  rows: LeadRow[];
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const ids = rows.map((r) => r.id);
  const sel = useBulkSelection(ids);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function doDelete() {
    if (!window.confirm(`${sel.count} Lead(s) wirklich löschen?`)) return;
    setBusy(true);
    const { ok, json } = await runBulk("/api/leads/bulk-delete", { ids: sel.selectedIds });
    setBusy(false);
    if (ok) {
      setMsg(`${json.data?.deleted ?? 0} gelöscht.`);
      sel.clear();
      router.refresh();
    } else {
      setMsg(json.error ?? "Löschen fehlgeschlagen");
    }
  }

  async function applyChanges(changes: Record<string, string | number>) {
    setBusy(true);
    const { ok, json } = await runBulk("/api/leads/bulk-update", {
      ids: sel.selectedIds,
      changes,
    });
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

  const fields: BulkField[] = [
    { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
    {
      key: "assignedUserId",
      label: "Zuweisen an",
      type: "select",
      options: users.map((u) => ({ value: u.id, label: u.name })),
    },
    { key: "addTag", label: "Tag hinzufügen", type: "text" },
    { key: "removeTag", label: "Tag entfernen", type: "text" },
  ];

  return (
    <>
      <BulkToolbar count={sel.count} busy={busy} onClear={sel.clear} onDelete={doDelete}>
        <button
          onClick={() => setDialog(true)}
          disabled={busy}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Ändern…
        </button>
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
            <Th>Titel</Th>
            <Th>Kontakt</Th>
            <Th>Kunde</Th>
            <Th className="text-right">Score</Th>
            <Th>Status</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l, i) => (
            <tr key={l.id} className={sel.isSelected(l.id) ? "bg-surface-3" : undefined}>
              <Td>
                <RowCheckbox
                  checked={sel.isSelected(l.id)}
                  onToggle={(shift) => sel.toggle(l.id, i, shift)}
                />
              </Td>
              <Td>
                <Link href={`/leads/${l.id}`} className="font-medium text-brand-700">
                  {l.title}
                </Link>
              </Td>
              <Td className="text-slate-600">{l.contact}</Td>
              <Td>{l.customerName ?? "—"}</Td>
              <Td className="text-right">{l.score}</Td>
              <Td>
                <LeadStatusSelect id={l.id} status={l.status} />
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/leads/${l.id}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Bearbeiten"
                  >
                    ✎
                  </Link>
                  <DeleteButton
                    url={`/api/leads/${l.id}`}
                    confirmText={`Lead „${l.title}" wirklich löschen?`}
                    iconOnly
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <Empty>Noch keine Leads.</Empty>}

      <BulkChangeDialog
        open={dialog}
        title={`${sel.count} Lead(s) ändern`}
        fields={fields}
        busy={busy}
        onClose={() => setDialog(false)}
        onApply={applyChanges}
      />
    </>
  );
}
