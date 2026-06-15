import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
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
    where.postalCode = {
      gte: f.plzFrom || undefined,
      lte: f.plzTo || undefined,
    };
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
    const start = d(data.startDate);
    const end = d(data.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Fix 2.1: Plausibilität der Datumsbereiche
    if (start && end && end < start) {
      throw new AppError("Das Enddatum muss nach dem Startdatum liegen.");
    }
    if (start && start < today) {
      throw new AppError("Das Startdatum einer neuen Kampagne darf nicht in der Vergangenheit liegen.");
    }
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

  /** Adressliste für CSV-Export (Druckerei-Format mit Ansprechpartner & Land). */
  async exportRows(campaignId: string): Promise<ExportAddress[]> {
    const recipients = await prisma.campaignRecipient.findMany({ where: { campaignId } });
    const custIds = [...new Set(recipients.map((r) => r.customerId).filter(Boolean) as string[])];
    const custs = custIds.length
      ? await prisma.customer.findMany({ where: { id: { in: custIds } }, include: { contacts: true } })
      : [];
    const map = new Map(custs.map((c) => [c.id, c]));

    return recipients.map((r) => {
      const c = r.customerId ? map.get(r.customerId) : undefined;
      if (!c) {
        return { anrede: "", name: "—", ansprechpartner: "", strasse: "", plz: "", ort: "", land: "" };
      }
      const primary = c.contacts.find((x) => x.isPrimary) ?? c.contacts[0];
      const ansprechpartner = primary
        ? `${primary.firstName} ${primary.lastName}`.trim()
        : c.type === "PRIVATE"
          ? [c.firstName, c.lastName].filter(Boolean).join(" ")
          : "";
      return {
        anrede: "",
        name: displayName(c),
        ansprechpartner,
        strasse: c.street ?? "",
        plz: c.postalCode ?? "",
        ort: c.city ?? "",
        land: c.country ?? "",
      };
    });
  },
};

export interface ExportAddress {
  anrede: string;
  name: string;
  ansprechpartner: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
}

export function recipientsToCSV(rows: ExportAddress[]): string {
  const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const headers = ["Anrede", "Name/Firma", "Ansprechpartner", "Strasse", "PLZ", "Ort", "Land"];
  const lines = [headers.join(";")];
  for (const r of rows) {
    lines.push([r.anrede, r.name, r.ansprechpartner, r.strasse, r.plz, r.ort, r.land].map(esc).join(";"));
  }
  return lines.join("\r\n");
}
