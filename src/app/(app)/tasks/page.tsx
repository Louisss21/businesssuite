import Link from "next/link";
import { PageHeader, Table, Th, Td, Empty } from "@/components/ui";
import { taskService } from "@/modules/tasks/task.service";
import { userService } from "@/modules/users/user.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { DeleteButton } from "@/components/DeleteButton";
import { TaskCreatePanel } from "./TaskCreatePanel";
import { TaskStatusSelect } from "./TaskStatusSelect";

export const dynamic = "force-dynamic";

const PRIO_BADGE: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

function dueClass(due: Date | null, status: string) {
  if (!due || status === "DONE" || status === "CANCELLED") return "text-slate-500";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  if (d < today) return "font-medium text-red-600";
  if (d.getTime() === today.getTime()) return "font-medium text-amber-600";
  return "text-slate-700";
}

const STATUS_FILTERS = ["", "OPEN", "IN_PROGRESS", "DONE", "CANCELLED"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string };
}) {
  const [tasks, users, customers] = await Promise.all([
    taskService.list({ status: searchParams.status, priority: searchParams.priority }),
    userService.list(),
    customerService.list(),
  ]);

  const userOptions = users.map((u) => ({ id: u.id, name: u.name }));
  const customerOptions = customers.map((c) => ({ id: c.id, name: displayName(c) }));

  return (
    <>
      <PageHeader title="Aufgaben" subtitle="Aufgaben & Wiedervorlagen" />
      <TaskCreatePanel users={userOptions} customers={customerOptions} />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/tasks?status=${s}` : "/tasks"}
            className={`rounded-full px-3 py-1 font-medium ${
              (searchParams.status ?? "") === s
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {s || "Alle"}
          </Link>
        ))}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Aufgabe</Th>
            <Th>Fällig</Th>
            <Th>Priorität</Th>
            <Th>Bezug</Th>
            <Th>Status</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <Td>
                <Link href={`/tasks/${t.id}`} className="font-medium text-brand-700">
                  {t.title}
                </Link>
              </Td>
              <Td className={dueClass(t.dueAt, t.status)}>
                {t.dueAt ? new Date(t.dueAt).toLocaleDateString("de-DE") : "—"}
              </Td>
              <Td>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PRIO_BADGE[t.priority]}`}>
                  {t.priority}
                </span>
              </Td>
              <Td className="text-slate-600">
                {t.relatedCustomerId ? (
                  <Link href={`/crm/${t.relatedCustomerId}`} className="text-brand-700">
                    {t.relatedCustomerName ?? "Kunde"}
                  </Link>
                ) : t.relatedLeadId ? (
                  <Link href={`/leads/${t.relatedLeadId}`} className="text-brand-700">
                    {t.relatedLeadTitle ?? "Lead"}
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
      {tasks.length === 0 && <Empty>Keine Aufgaben.</Empty>}
    </>
  );
}
