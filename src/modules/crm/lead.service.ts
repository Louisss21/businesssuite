import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { leadCreateSchema, leadUpdateSchema, splitTags } from "./lead.schema";

const orNull = (v?: string | null) => (v ? v : null);

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

  create(input: unknown) {
    const d = leadCreateSchema.parse(input);
    return prisma.lead.create({
      data: {
        title: d.title,
        status: d.status,
        notes: orNull(d.notes),
        firstName: orNull(d.firstName),
        lastName: orNull(d.lastName),
        email: orNull(d.email),
        phone: orNull(d.phone),
        company: orNull(d.company),
        position: orNull(d.position),
        score: d.score ?? 0,
        tags: splitTags(d.tags),
        source: orNull(d.source),
        lostReason: orNull(d.lostReason),
        assignedUserId: orNull(d.assignedUserId),
        customerId: d.customerId ? d.customerId : null,
      },
    });
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const d = leadUpdateSchema.parse(input);
    return prisma.lead.update({
      where: { id },
      data: {
        title: d.title,
        status: d.status,
        notes: d.notes === undefined ? undefined : orNull(d.notes),
        firstName: d.firstName === undefined ? undefined : orNull(d.firstName),
        lastName: d.lastName === undefined ? undefined : orNull(d.lastName),
        email: d.email === undefined ? undefined : orNull(d.email),
        phone: d.phone === undefined ? undefined : orNull(d.phone),
        company: d.company === undefined ? undefined : orNull(d.company),
        position: d.position === undefined ? undefined : orNull(d.position),
        score: d.score,
        tags: d.tags === undefined ? undefined : splitTags(d.tags),
        source: d.source === undefined ? undefined : orNull(d.source),
        lostReason: d.lostReason === undefined ? undefined : orNull(d.lostReason),
        customerId:
          d.customerId === undefined ? undefined : d.customerId ? d.customerId : null,
      },
    });
  },

  delete(id: string) {
    return prisma.lead.delete({ where: { id } });
  },

  /**
   * Massen-Import von Leads. Dedupliziert über E-Mail.
   * mode "skip" = Duplikate überspringen, "update" = vorhandene aktualisieren.
   * dryRun = nur zählen (Dublettenprüfung), nichts schreiben.
   */
  async bulkImport(
    rows: Record<string, string>[],
    mode: "skip" | "update",
    dryRun = false,
  ) {
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let duplicates = 0;

    for (const r of rows) {
      const email = (r.email || "").trim().toLowerCase();
      const title =
        (r.title || "").trim() ||
        (r.company || "").trim() ||
        [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
        email ||
        "Importierter Lead";

      const existing = email
        ? await prisma.lead.findFirst({ where: { email } })
        : null;

      if (existing) {
        duplicates++;
        if (dryRun) continue;
        if (mode === "update") {
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              title,
              firstName: orNull(r.firstName),
              lastName: orNull(r.lastName),
              phone: orNull(r.phone),
              company: orNull(r.company),
              source: orNull(r.source) ?? "Import",
            },
          });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      if (dryRun) {
        created++;
        continue;
      }
      await prisma.lead.create({
        data: {
          title,
          status: "NEW",
          email: email || null,
          firstName: orNull(r.firstName),
          lastName: orNull(r.lastName),
          phone: orNull(r.phone),
          company: orNull(r.company),
          source: orNull(r.source) ?? "Import",
          tags: [],
        },
      });
      created++;
    }

    return { total: rows.length, created, updated, skipped, duplicates };
  },

  /** Lead in einen Kunden umwandeln (Status -> WON, Verknüpfung gesetzt). */
  async convert(id: string) {
    const lead = await this.getById(id);
    if (lead.status !== "QUALIFIED" && lead.status !== "WON") {
      throw new AppError(
        "Nur qualifizierte oder gewonnene Leads können umgewandelt werden.",
      );
    }
    if (lead.customerId) {
      throw new AppError("Dieser Lead ist bereits mit einem Kunden verknüpft.");
    }

    const isCompany = !!lead.company;
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          type: isCompany ? "COMPANY" : "PRIVATE",
          companyName: orNull(lead.company),
          firstName: orNull(lead.firstName),
          lastName: orNull(lead.lastName),
          email: orNull(lead.email),
          phone: orNull(lead.phone),
          source: lead.source ?? "Kampagne",
          notes: orNull(lead.notes),
        },
      });
      await tx.lead.update({
        where: { id },
        data: { status: "WON", customerId: customer.id },
      });
      return customer;
    });
  },
};
