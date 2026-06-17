import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { computeLineAmounts, sumTotals } from "@/lib/money";
import { nextNumber } from "@/modules/shared/numbering.service";
import { settingsService } from "@/modules/settings/settings.service";
import {
  orderCreateSchema,
  orderStatuses,
  orderUpdateSchema,
  type OrderItemInput,
} from "./order.schema";

function buildItems(items: OrderItemInput[], sortBase = 0) {
  const computed = items.map((it, i) => {
    const amounts = computeLineAmounts(it);
    return {
      productName: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      taxRate: it.taxRate,
      ...amounts,
      sortOrder: sortBase + i,
    };
  });
  const totals = sumTotals(computed);
  return { computed, totals };
}

export const orderService = {
  list(query?: { status?: string; customerId?: string }) {
    return prisma.order.findMany({
      where: { status: query?.status as never, customerId: query?.customerId },
      orderBy: { createdAt: "desc" },
      include: { customer: true, invoice: { select: { id: true, invoiceNumber: true } } },
    });
  },

  async getById(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { orderBy: { sortOrder: "asc" } },
        invoice: true,
      },
    });
    if (!order) throw notFound("Bestellung nicht gefunden");
    return order;
  },

  async create(input: unknown) {
    const data = orderCreateSchema.parse(input);
    const settings = await settingsService.get();
    const year = new Date().getFullYear();
    const { computed, totals } = buildItems(data.items);

    return prisma.$transaction(async (tx) => {
      const orderNumber = await nextNumber(tx, "order", year, settings.orderNumberFormat);
      return tx.order.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          status: data.status,
          notes: data.notes,
          netTotal: totals.netTotal,
          taxTotal: totals.taxTotal,
          grossTotal: totals.grossTotal,
          items: { create: computed },
        },
        include: { items: true, customer: true },
      });
    });
  },

  async update(id: string, input: unknown) {
    const order = await this.getById(id);
    const data = orderUpdateSchema.parse(input);

    if (order.invoice && data.items) {
      throw new AppError("Bestellung mit Rechnung – Positionen nicht mehr änderbar.");
    }

    // Wenn Positionen mitkommen: neu berechnen und ersetzen
    if (data.items) {
      const { computed, totals } = buildItems(data.items);
      return prisma.$transaction(async (tx) => {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
        return tx.order.update({
          where: { id },
          data: {
            customerId: data.customerId,
            status: data.status,
            notes: data.notes,
            netTotal: totals.netTotal,
            taxTotal: totals.taxTotal,
            grossTotal: totals.grossTotal,
            items: { create: computed },
          },
          include: { items: true, customer: true },
        });
      });
    }

    return prisma.order.update({
      where: { id },
      data: { customerId: data.customerId, status: data.status, notes: data.notes },
      include: { items: true, customer: true },
    });
  },

  async delete(id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { invoice: { select: { id: true } } },
    });
    if (!order) throw notFound("Bestellung nicht gefunden");
    if (order.invoice) {
      throw new AppError(
        "Bestellung kann nicht gelöscht werden – es existiert eine Rechnung. Bitte zuerst die Rechnung löschen.",
        409,
      );
    }
    // OrderItems werden per Cascade mitgelöscht
    return prisma.order.delete({ where: { id } });
  },

  /** Punkt 4: Bestellung duplizieren (neue Nummer, Status DRAFT, Positionen kopiert, Quelle MANUAL). */
  async duplicate(id: string) {
    const src = await this.getById(id);
    const settings = await settingsService.get();
    const year = new Date().getFullYear();
    return prisma.$transaction(async (tx) => {
      const orderNumber = await nextNumber(tx, "order", year, settings.orderNumberFormat);
      return tx.order.create({
        data: {
          orderNumber,
          customerId: src.customerId,
          status: "DRAFT",
          source: "MANUAL",
          notes: src.notes,
          netTotal: src.netTotal,
          taxTotal: src.taxTotal,
          grossTotal: src.grossTotal,
          items: {
            create: src.items.map((it, i) => ({
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxRate: it.taxRate,
              netAmount: it.netAmount,
              taxAmount: it.taxAmount,
              grossAmount: it.grossAmount,
              sortOrder: i,
            })),
          },
        },
      });
    });
  },

  /** B2: Bestellungen löschen – mit Rechnung verknüpfte werden übersprungen. */
  async bulkDelete(ids: string[]) {
    const orders = await prisma.order.findMany({
      where: { id: { in: ids } },
      include: { invoice: { select: { id: true } } },
    });
    const deletable = orders.filter((o) => !o.invoice).map((o) => o.id);
    const skipped = orders
      .filter((o) => o.invoice)
      .map((o) => ({ id: o.id, reason: "Rechnung vorhanden" }));
    let deleted = 0;
    if (deletable.length) {
      const res = await prisma.order.deleteMany({ where: { id: { in: deletable } } });
      deleted = res.count;
    }
    return { deleted, skipped };
  },

  /** B3: Massenstatus für Bestellungen. */
  async bulkUpdate(ids: string[], changes: { status?: string }) {
    const data: Record<string, unknown> = {};
    if (changes.status) {
      if (!orderStatuses.includes(changes.status as never)) throw new AppError("Ungültiger Status");
      data.status = changes.status;
    }
    if (Object.keys(data).length === 0) return { updated: 0 };
    const res = await prisma.order.updateMany({ where: { id: { in: ids } }, data });
    return { updated: res.count };
  },
};
