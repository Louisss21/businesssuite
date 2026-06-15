import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { nextNumber } from "@/modules/shared/numbering.service";
import { settingsService } from "@/modules/settings/settings.service";
import { orderService } from "@/modules/orders/order.service";
import {
  computeQuoteItem,
  quoteCreateSchema,
  quoteUpdateSchema,
  type QuoteItemInput,
} from "./quote.schema";

const r2 = (n: number) => Math.round(n * 100) / 100;

function buildItems(items: QuoteItemInput[]) {
  const rows = items.map((it, i) => ({
    productId: it.productId || null,
    name: it.name,
    qty: it.qty,
    unitPrice: it.unitPrice,
    discountPct: it.discountPct,
    taxRate: it.taxRate,
    sortOrder: i,
  }));
  const totals = items.reduce(
    (acc, it) => {
      const a = computeQuoteItem(it);
      return {
        netTotal: r2(acc.netTotal + a.net),
        taxTotal: r2(acc.taxTotal + a.tax),
        grossTotal: r2(acc.grossTotal + a.gross),
      };
    },
    { netTotal: 0, taxTotal: 0, grossTotal: 0 },
  );
  return { rows, totals };
}

const normDate = (v: unknown): Date | null =>
  v instanceof Date ? v : null;

const startOfToday = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const quoteService = {
  /** Fix 2.2: abgelaufene Angebote (validUntil < heute, Status SENT/DRAFT) auf EXPIRED setzen. */
  markExpired() {
    return prisma.quote.updateMany({
      where: { status: { in: ["SENT", "DRAFT"] }, validUntil: { not: null, lt: startOfToday() } },
      data: { status: "EXPIRED" },
    });
  },

  async list(query?: { status?: string }) {
    await this.markExpired();
    return prisma.quote.findMany({
      where: { status: query?.status as never },
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    });
  },

  async getById(id: string) {
    await this.markExpired();
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!quote) throw notFound("Angebot nicht gefunden");
    return quote;
  },

  async create(input: unknown) {
    const data = quoteCreateSchema.parse(input);
    // Fix 2.1: "gültig bis" darf bei neuem Angebot nicht in der Vergangenheit liegen
    const vu = normDate(data.validUntil);
    if (vu && vu < startOfToday()) {
      throw new AppError("„Gültig bis" darf nicht in der Vergangenheit liegen.");
    }
    const settings = await settingsService.get();
    const year = new Date().getFullYear();
    const { rows, totals } = buildItems(data.items);

    return prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "quote", year, settings.quoteNumberFormat);
      return tx.quote.create({
        data: {
          number,
          customerId: data.customerId,
          status: data.status,
          validUntil: normDate(data.validUntil),
          notes: data.notes || null,
          netTotal: totals.netTotal,
          taxTotal: totals.taxTotal,
          grossTotal: totals.grossTotal,
          items: { create: rows },
        },
        include: { items: true, customer: true },
      });
    });
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const data = quoteUpdateSchema.parse(input);

    if (data.items) {
      const { rows, totals } = buildItems(data.items);
      return prisma.$transaction(async (tx) => {
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });
        return tx.quote.update({
          where: { id },
          data: {
            status: data.status,
            validUntil:
              data.validUntil === undefined ? undefined : normDate(data.validUntil),
            notes: data.notes === undefined ? undefined : data.notes || null,
            netTotal: totals.netTotal,
            taxTotal: totals.taxTotal,
            grossTotal: totals.grossTotal,
            items: { create: rows },
          },
          include: { items: true, customer: true },
        });
      });
    }

    return prisma.quote.update({
      where: { id },
      data: {
        status: data.status,
        validUntil:
          data.validUntil === undefined ? undefined : normDate(data.validUntil),
        notes: data.notes === undefined ? undefined : data.notes || null,
      },
      include: { items: true, customer: true },
    });
  },

  delete(id: string) {
    return prisma.quote.delete({ where: { id } });
  },

  /** Angebot in einen Auftrag (Order) umwandeln. Rabatt wird in den Einzelpreis eingerechnet. */
  async convertToOrder(id: string) {
    const quote = await this.getById(id);
    if (quote.status === "REJECTED" || quote.status === "EXPIRED") {
      throw new AppError("Abgelehnte oder abgelaufene Angebote können nicht umgewandelt werden.");
    }
    const order = await orderService.create({
      customerId: quote.customerId,
      status: "CONFIRMED",
      notes: `Aus Angebot ${quote.number}`,
      items: quote.items.map((it) => ({
        productName: it.name,
        quantity: it.qty,
        unitPrice: r2(it.unitPrice * (1 - it.discountPct / 100)),
        taxRate: it.taxRate,
      })),
    });
    await prisma.quote.update({ where: { id }, data: { status: "ACCEPTED" } });
    return order;
  },
};
