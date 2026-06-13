import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { computeLineAmounts, sumTotals } from "@/lib/money";
import { nextNumber } from "@/modules/shared/numbering.service";
import { settingsService } from "@/modules/settings/settings.service";
import {
  orderCreateSchema,
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
      data: { status: data.status, notes: data.notes },
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
};
