import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http";
import { displayName } from "@/modules/crm/customer.service";
import { taskCreateSchema, taskUpdateSchema } from "./task.schema";

const orNull = (v?: string | null) => (v ? v : null);
const normDate = (v: unknown): Date | null => (v instanceof Date ? v : null);

function toData(d: ReturnType<typeof taskCreateSchema.parse>) {
  return {
    title: d.title,
    description: orNull(d.description),
    assignedToId: orNull(d.assignedToId),
    relatedCustomerId: orNull(d.relatedCustomerId),
    relatedLeadId: orNull(d.relatedLeadId),
    dueAt: normDate(d.dueAt),
    status: d.status,
    priority: d.priority,
  };
}

/** Reichert Tasks um Namen der verknüpften Kunden/Leads an (keine Prisma-Relation). */
async function enrich<T extends { relatedCustomerId: string | null; relatedLeadId: string | null }>(
  tasks: T[],
) {
  const custIds = [...new Set(tasks.map((t) => t.relatedCustomerId).filter(Boolean) as string[])];
  const leadIds = [...new Set(tasks.map((t) => t.relatedLeadId).filter(Boolean) as string[])];
  const [custs, leads] = await Promise.all([
    custIds.length
      ? prisma.customer.findMany({ where: { id: { in: custIds } } })
      : Promise.resolve([]),
    leadIds.length
      ? prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, title: true } })
      : Promise.resolve([]),
  ]);
  const custMap = new Map(custs.map((c) => [c.id, displayName(c)]));
  const leadMap = new Map(leads.map((l) => [l.id, l.title]));
  return tasks.map((t) => ({
    ...t,
    relatedCustomerName: t.relatedCustomerId ? custMap.get(t.relatedCustomerId) ?? null : null,
    relatedLeadTitle: t.relatedLeadId ? leadMap.get(t.relatedLeadId) ?? null : null,
  }));
}

export const taskService = {
  async list(query?: { status?: string; priority?: string }) {
    const tasks = await prisma.task.findMany({
      where: {
        status: query?.status as never,
        priority: query?.priority as never,
      },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    });
    return enrich(tasks);
  },

  async getById(id: string) {
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) throw notFound("Aufgabe nicht gefunden");
    return task;
  },

  create(input: unknown) {
    const d = taskCreateSchema.parse(input);
    return prisma.task.create({ data: toData(d) });
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const d = taskUpdateSchema.parse(input);
    return prisma.task.update({
      where: { id },
      data: {
        title: d.title,
        description: d.description === undefined ? undefined : orNull(d.description),
        assignedToId: d.assignedToId === undefined ? undefined : orNull(d.assignedToId),
        relatedCustomerId:
          d.relatedCustomerId === undefined ? undefined : orNull(d.relatedCustomerId),
        relatedLeadId: d.relatedLeadId === undefined ? undefined : orNull(d.relatedLeadId),
        dueAt: d.dueAt === undefined ? undefined : normDate(d.dueAt),
        status: d.status,
        priority: d.priority,
      },
    });
  },

  delete(id: string) {
    return prisma.task.delete({ where: { id } });
  },

  /** Offene Aufgaben, die heute fällig oder überfällig sind (Dashboard). */
  async dueSoon(limit = 5) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ["OPEN", "IN_PROGRESS"] },
        dueAt: { not: null, lte: end },
      },
      orderBy: { dueAt: "asc" },
      take: limit,
    });
    return enrich(tasks);
  },

  openCount() {
    return prisma.task.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
  },
};
