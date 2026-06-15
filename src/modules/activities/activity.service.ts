import { prisma } from "@/lib/db";
import { activityCreateSchema } from "./activity.schema";

export const activityService = {
  list(query: { customerId?: string; leadId?: string; type?: string }) {
    return prisma.activity.findMany({
      where: {
        customerId: query.customerId,
        leadId: query.leadId,
        type: query.type as never,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  create(input: unknown) {
    const d = activityCreateSchema.parse(input);
    return prisma.activity.create({
      data: {
        type: d.type,
        subject: d.subject,
        body: d.body || null,
        customerId: d.customerId || null,
        leadId: d.leadId || null,
      },
    });
  },

  delete(id: string) {
    return prisma.activity.delete({ where: { id } });
  },
};
