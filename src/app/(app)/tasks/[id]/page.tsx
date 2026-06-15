import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import { taskService } from "@/modules/tasks/task.service";
import { userService } from "@/modules/users/user.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { DeleteButton } from "@/components/DeleteButton";
import { TaskForm } from "../TaskForm";

export const dynamic = "force-dynamic";

const isoDate = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const task = await taskService.getById(params.id).catch(() => null);
  if (!task) notFound();

  const [users, customers] = await Promise.all([
    userService.list(),
    customerService.list(),
  ]);

  return (
    <>
      <PageHeader
        title={task.title}
        subtitle="Aufgabe bearbeiten"
        action={
          <div className="flex flex-wrap gap-2">
            <DeleteButton
              url={`/api/tasks/${task.id}`}
              confirmText={`Aufgabe „${task.title}" wirklich löschen?`}
              redirectTo="/tasks"
              label="Löschen"
            />
            <LinkButton href="/tasks" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />
      <TaskForm
        users={users.map((u) => ({ id: u.id, name: u.name }))}
        customers={customers.map((c) => ({ id: c.id, name: displayName(c) }))}
        task={{
          id: task.id,
          title: task.title,
          description: task.description,
          assignedToId: task.assignedToId,
          relatedCustomerId: task.relatedCustomerId,
          relatedLeadId: task.relatedLeadId,
          dueAt: isoDate(task.dueAt),
          status: task.status,
          priority: task.priority,
        }}
      />
    </>
  );
}
