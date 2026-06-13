import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http";
import {
  leadCreateSchema,
  leadUpdateSchema,
  type LeadCreateInput,
} from "./lead.schema";

export const leadService = {
  list(query?: { status?: string }) {
    return prisma.lead.findMany({
      where: { status: query?.status as never },
      orderBy: { updatedAt: "desc" },
      include: { customer: true },
    });
  },

  async getById(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!lead) throw notFound("Lead nicht gefunden");
    return lead;
  },

  create(input: LeadCreateInput) {
    const data = leadCreateSchema.parse(input);
    return prisma.lead.create({ data });
  },

  async update(id: string, input: unknown) {
    const data = leadUpdateSchema.parse(input);
    return prisma.lead.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.lead.delete({ where: { id } });
  },
};
