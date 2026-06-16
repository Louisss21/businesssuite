import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import {
  contactSchema,
  customerCreateSchema,
  customerUpdateSchema,
  type ContactInput,
  type CustomerCreateInput,
} from "./customer.schema";

/** Business-Logik rund um Kunden + Ansprechpartner. UI/API rufen nur hier auf. */
export const customerService = {
  list(query?: { type?: "COMPANY" | "PRIVATE"; search?: string }) {
    return prisma.customer.findMany({
      where: {
        type: query?.type,
        OR: query?.search
          ? [
              { companyName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true, leads: true, invoices: true } } },
    });
  },

  async getById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        contacts: true,
        leads: { orderBy: { createdAt: "desc" } },
        orders: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { issueDate: "desc" } },
      },
    });
    if (!customer) throw notFound("Kunde nicht gefunden");
    return customer;
  },

  create(input: CustomerCreateInput) {
    const data = customerCreateSchema.parse(input);
    return prisma.customer.create({ data });
  },

  async update(id: string, input: unknown) {
    await this.getById(id); // wirft 404, falls nicht vorhanden
    const data = customerUpdateSchema.parse(input);
    return prisma.customer.update({ where: { id }, data });
  },

  async delete(id: string) {
    try {
      return await prisma.customer.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        throw new AppError(
          "Kunde kann nicht gelöscht werden – es existieren noch Bestellungen oder Rechnungen. Bitte diese zuerst löschen.",
          409,
        );
      }
      throw e;
    }
  },

  addContact(customerId: string, input: ContactInput) {
    const data = contactSchema.parse(input);
    return prisma.contactPerson.create({ data: { ...data, customerId } });
  },

  /** B2: Kunden löschen – mit Bestellungen/Rechnungen/Angeboten verknüpfte überspringen. */
  async bulkDelete(ids: string[]) {
    const rows = await prisma.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true, _count: { select: { orders: true, invoices: true, quotes: true } } },
    });
    const deletable = rows
      .filter((c) => c._count.orders === 0 && c._count.invoices === 0 && c._count.quotes === 0)
      .map((c) => c.id);
    const skipped = rows
      .filter((c) => c._count.orders > 0 || c._count.invoices > 0 || c._count.quotes > 0)
      .map((c) => ({ id: c.id, reason: "hat Bestellungen/Rechnungen/Angebote" }));
    let deleted = 0;
    if (deletable.length) {
      const res = await prisma.customer.deleteMany({ where: { id: { in: deletable } } });
      deleted = res.count;
    }
    return { deleted, skipped };
  },

  /** B3: Klassifizierung mehrerer Kunden setzen. */
  async bulkUpdate(ids: string[], changes: { classification?: string }) {
    const data: Record<string, unknown> = {};
    if (changes.classification) data.classification = changes.classification;
    if (Object.keys(data).length === 0) return { updated: 0 };
    const res = await prisma.customer.updateMany({ where: { id: { in: ids } }, data });
    return { updated: res.count };
  },
};

export const displayName = (c: {
  type: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
}) =>
  c.type === "COMPANY"
    ? c.companyName ?? "—"
    : [c.firstName, c.lastName].filter(Boolean).join(" ") || "—";
