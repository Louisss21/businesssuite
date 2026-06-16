"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Table, Th, Td, Empty } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";
import { TaskStatusSelect } from "./TaskStatusSelect";
import { useBulkSelection } from "@/components/bulk/useBulkSelection";
import {
  BulkToolbar,
  BulkChangeDialog,
  RowCheckbox,
  SelectAllCheckbox,
  runBulk,
  type BulkField,
} from "@/components/bulk/BulkUI";

export type TaskRow = {
  id: string;
  title: string;
  dueLabel: string;
  dueState: "overdue" | "today" | "future" | "none";
  priority: string;
  bezugKind: "customer" | "lead" | null;
  bezugId: string | null;
  bezugName: string | null;
  status: string;
};

const PRIO_BADGE: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

const DUE_CLASS: Record<string, string> = {
  overdue: "font-medium text-red-600",
  today: "font-medium text-amber-600",
  future: "text-slate-700",
  none: "text-slate-500",
};

export function TasksTable({
  rows,
  users,
}: {
  rows: TaskRow[];
  users: { id: string; name: string }[];
}) {
  const router = useRouter();
  const ids = rows.map((r) => r.id);
  const sel = useBulkSelection(ids);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function doDelete() {
    if (!window.confirm(`${sel.count} Aufgabe(n) wirklich löschen?`)) return;
    setBusy(true);
    const { ok, json } = await runBulk("/api/tasks/bulk-delete", { ids: sel.selectedIds });
    setBusy(false);
    if (ok) {
      setMsg(`${json.data?.deleted ?? 0} gelöscht.`);
      sel.clear();
      router.refresh();
    } else setMsg(json.error ?? "Löschen fehlgeschlagen");
  }

  async function applyChanges(changes: Record<string, string | number>) {
    setBusy(true);
    const { ok, json } = await runBulk("/api/tasks/bulk-update", { ids: sel.selectedIds, changes });
    setBusy(false);
    if (ok) {
      setDialog(false);
      setMsg(`${json.data?.updated ?? 0} aktualisiert.`);
      sel.clear();
      router.refresh();
    } else setMsg(json.error ?? "Aktualisierung fehlgeschlagen");
  }

  const fields: BulkField[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].map((s) => ({ value: s, label: s })),
    },
    {
      key: "priority",
      label: "Priorität",
      type: "select",
      options: ["LOW", "MEDIUM", "HIGH", "URGENT"].map((s) => ({ value: s, label: s })),
    },
    {
      key: "assignedToId",
      label: "Zuweisen an",
      type: "select",
      options: users.map((u) => ({ value: u.id, label: u.name })),
    },
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
              <SelectAllCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} />
            </Th>
            <Th>Aufgabe</Th>
            <Th>Fällig</Th>
            <Th>Priorität</Th>
            <Th>Bezug</Th>
            <Th>Status</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.id} className={sel.isSelected(t.id) ? "bg-surface-3" : undefined}>
              <Td>
                <RowCheckbox checked={sel.isSelected(t.id)} onToggle={(shift) => sel.toggle(t.id, i, shift)} />
              </Td>
              <Td>
                <Link href={`/tasks/${t.id}`} className="font-medium text-brand-700">
                  {t.title}
                </Link>
              </Td>
              <Td className={DUE_CLASS[t.dueState]}>{t.dueLabel}</Td>
              <Td>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIO_BADGE[t.priority]}`}>
                  {t.priority}
                </span>
              </Td>
              <Td className="text-slate-600">
                {t.bezugKind === "customer" && t.bezugId ? (
                  <Link href={`/crm/${t.bezugId}`} className="text-brand-700">
                    {t.bezugName ?? "Kunde"}
                  </Link>
                ) : t.bezugKind === "lead" && t.bezugId ? (
                  <Link href={`/leads/${t.bezugId}`} className="text-brand-700">
                    {t.bezugName ?? "Lead"}
                  </Link>
                ) : (
                  "—"
                )}
              </Td>
              <Td>
                <TaskStatusSelect id={t.id} status={t.status} />
              </Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/tasks/${t.id}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Bearbeiten"
                  >
                    ✎
                  </Link>
                  <DeleteButton
                    url={`/api/tasks/${t.id}`}
                    confirmText={`Aufgabe „${t.title}" wirklich löschen?`}
                    iconOnly
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <Empty>Keine Aufgaben.</Empty>}

      <BulkChangeDialog
        open={dialog}
        title={`${sel.count} Aufgabe(n) ändern`}
        fields={fields}
        busy={busy}
        onClose={() => setDialog(false)}
        onApply={applyChanges}
      />
    </>
  );
}
