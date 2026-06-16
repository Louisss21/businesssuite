import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { taskService } from "@/modules/tasks/task.service";
import { userService } from "@/modules/users/user.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { TaskCreatePanel } from "./TaskCreatePanel";
import { TasksTable, type TaskRow } from "./TasksTable";

export const dynamic = "force-dynamic";

function dueState(due: Date | null, status: string): TaskRow["dueState"] {
  if (!due || status === "DONE" || status === "CANCELLED") return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  if (d < today) return "overdue";
  if (d.getTime() === today.getTime()) return "today";
  return "future";
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

  const rows: TaskRow[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    dueLabel: t.dueAt ? new Date(t.dueAt).toLocaleDateString("de-DE") : "—",
    dueState: dueState(t.dueAt, t.status),
    priority: t.priority,
    bezugKind: t.relatedCustomerId ? "customer" : t.relatedLeadId ? "lead" : null,
    bezugId: t.relatedCustomerId ?? t.relatedLeadId ?? null,
    bezugName: t.relatedCustomerName ?? t.relatedLeadTitle ?? null,
    status: t.status,
  }));

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

      <TasksTable rows={rows} users={userOptions} />
    </>
  );
}
