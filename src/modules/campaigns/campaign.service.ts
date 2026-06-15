import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http";
import { displayName } from "@/modules/crm/customer.service";
import {
  campaignCreateSchema,
  campaignUpdateSchema,
  targetFilterSchema,
  type TargetFilter,
} from "./campaign.schema";

const d = (v: unknown): Date | null => (v instanceof Date ? v : null);

/** baut die Prisma-where-Bedingung aus dem Zielgruppen-Filter (Kunden). */
function buildWhere(f: TargetFilter): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {};
  if (f.customerType) where.type = f.customerType;
  if (f.classification) where.classification = f.classification;
  if (f.plzFrom || f.plzTo) {
    where.postalCode = {};
    if (f.plzFrom) where.postalCode.gte = f.plzFrom;
    if (f.plzTo) where.postalCode.lte = f.plzTo;
  }
  if (f.noPurchaseMonths && Number(f.noPurchaseMonths) > 0) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - Number(f.noPurchaseMonths));
    where.invoices = { none: { issueDate: { gte: cutoff } } };
  }
  return where;
}

export const campaignService = {
  list() {
    return prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { recipients: true } } },
    });
  },

  async getById(id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { recipients: true, _count: { select: { recipients: true } } },
    });
    if (!campaign) throw notFound("Kampagne nicht gefunden");

    // Empfängernamen (Kunden) auflösen
    const custIds = [
      ...new Set(campaign.recipients.map((r) => r.customerId).filter(Boolean) as string[]),
    ];
    const custs = custIds.length
      ? await prisma.customer.findMany({ where: { id: { in: custIds } } })
      : [];
    const map = new Map(custs.map((c) => [c.id, c]));
    const recipients = campaign.recipients.map((r) => {
      const c = r.customerId ? map.get(r.customerId) : null;
      return {
        ...r,
        name: c ? displayName(c) : "—",
        address: c
          ? [c.street, `${c.postalCode ?? ""} ${c.city ?? ""}`.trim()].filter(Boolean).join(", ")
          : "",
      };
    });
    return { ...campaign, recipients };
  },

  create(input: unknown) {
    const data = campaignCreateSchema.parse(input);
    return prisma.campaign.create({
      data: {
        name: data.name,
        type: data.type,
        status: data.status,
        startDate: d(data.startDate),
        endDate: d(data.endDate),
        budget: typeof data.budget === "number" ? data.budget : null,
        notes: data.notes || null,
      },
    });
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const data = campaignUpdateSchema.parse(input);
    return prisma.campaign.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        status: data.status,
        startDate: data.startDate === undefined ? undefined : d(data.startDate),
        endDate: data.endDate === undefined ? undefined : d(data.endDate),
        budget:
          data.budget === undefined ? undefined : typeof data.budget === "number" ? data.budget : null,
        notes: data.notes === undefined ? undefined : data.notes || null,
      },
    });
  },

  delete(id: string) {
    return prisma.campaign.delete({ where: { id } });
  },

  /** Vorschau: wie viele Kunden trifft der Filter? */
  previewCount(input: unknown) {
    const f = targetFilterSchema.parse(input);
    return prisma.customer.count({ where: buildWhere(f) });
  },

  /** Empfänger anhand des Filters hinzufügen (Duplikate werden übersprungen). */
  async addRecipients(campaignId: string, input: unknown) {
    await this.getById(campaignId);
    const f = targetFilterSchema.parse(input);
    const customers = await prisma.customer.findMany({
      where: buildWhere(f),
      select: { id: true },
    });
    const existing = await prisma.campaignRecipient.findMany({
      where: { campaignId },
      select: { customerId: true },
    });
    const have = new Set(existing.map((e) => e.customerId));
    const toAdd = customers.filter((c) => !have.has(c.id));
    if (toAdd.length) {
      await prisma.campaignRecipient.createMany({
        data: toAdd.map((c) => ({ campaignId, customerId: c.id })),
      });
    }
    return { added: toAdd.length, skipped: customers.length - toAdd.length };
  },

  async recordResponse(recipientId: string, body: { responded?: boolean; converted?: boolean }) {
    return prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        respondedAt: body.responded ? new Date() : body.responded === false ? null : undefined,
        converted: body.converted,
      },
    });
  },

  removeRecipient(recipientId: string) {
    return prisma.campaignRecipient.delete({ where: { id: recipientId } });
  },

  async markAllSent(campaignId: string) {
    await prisma.campaignRecipient.updateMany({
      where: { campaignId, sentAt: null },
      data: { sentAt: new Date() },
    });
    return { success: true };
  },

  /** Adressliste für CSV-Export (Druckerei-Format). */
  async exportRows(campaignId: string) {
    const c = await this.getById(campaignId);
    return c.recipients.map((r) => {
      const parts = r.address.split(", ");
      return {
        name: r.name,
        strasse: parts[0] ?? "",
        plzOrt: parts[1] ?? "",
      };
    });
  },
};

export function recipientsToCSV(rows: { name: string; strasse: string; plzOrt: string }[]): string {
  const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = ["Name;Strasse;PLZ_Ort"];
  for (const r of rows) lines.push([r.name, r.strasse, r.plzOrt].map(esc).join(";"));
  return lines.join("\r\n");
}
