import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { nextNumber } from "@/modules/shared/numbering.service";
import { settingsService } from "@/modules/settings/settings.service";
import { accountingPeriodService } from "@/modules/billing-archive/accounting-period.service";
import {
  invoiceFromOrderSchema,
  invoiceUpdateSchema,
} from "./invoice.schema";

const fullInclude = {
  customer: true,
  items: { orderBy: { sortOrder: "asc" } },
  accountingPeriod: true,
  order: { select: { id: true, orderNumber: true } },
} as const;

export const invoiceService = {
  list(query?: {
    status?: string;
    customerId?: string;
    year?: number;
    month?: number;
    quarter?: number;
  }) {
    return prisma.invoice.findMany({
      where: {
        status: query?.status as never,
        customerId: query?.customerId,
        accountingPeriod: {
          year: query?.year,
          month: query?.month,
          quarter: query?.quarter,
        },
      },
      orderBy: { issueDate: "desc" },
      include: { customer: true, accountingPeriod: true },
    });
  },

  async getById(id: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: fullInclude,
    });
    if (!invoice) throw notFound("Rechnung nicht gefunden");
    return invoice;
  },

  /**
   * Erzeugt eine Rechnung aus einer Bestellung:
   *  - übernimmt Positionen 1:1 (Snapshot, Beträge bereits berechnet)
   *  - vergibt eindeutige Rechnungsnummer
   *  - ordnet automatisch der Buchhaltungs-Periode (Monat/Quartal/Jahr) zu
   */
  async createFromOrder(input: unknown) {
    const { orderId, issueDate, dueDate } = invoiceFromOrderSchema.parse(input);
    const settings = await settingsService.get();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { orderBy: { sortOrder: "asc" } }, invoice: true },
    });
    if (!order) throw notFound("Bestellung nicht gefunden");
    if (order.invoice) {
      throw new AppError("Für diese Bestellung existiert bereits eine Rechnung.");
    }
    if (order.status === "CANCELLED") {
      throw new AppError("Stornierte Bestellung kann nicht abgerechnet werden.");
    }

    const issued = issueDate ?? new Date();
    const due =
      dueDate ??
      new Date(issued.getTime() + settings.defaultPaymentTermDays * 86_400_000);

    const period = await accountingPeriodService.ensureForDate(issued);
    const year = issued.getFullYear();

    return prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextNumber(
        tx,
        "invoice",
        year,
        settings.invoiceNumberFormat,
      );
      return tx.invoice.create({
        data: {
          invoiceNumber,
          status: "OPEN",
          customerId: order.customerId,
          orderId: order.id,
          issueDate: issued,
          dueDate: due,
          netTotal: order.netTotal,
          taxTotal: order.taxTotal,
          grossTotal: order.grossTotal,
          accountingPeriodId: period.id,
          items: {
            create: order.items.map((it) => ({
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxRate: it.taxRate,
              netAmount: it.netAmount,
              taxAmount: it.taxAmount,
              grossAmount: it.grossAmount,
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: fullInclude,
      });
    });
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const data = invoiceUpdateSchema.parse(input);
    return prisma.invoice.update({
      where: { id },
      data: {
        status: data.status,
        dueDate: data.dueDate,
        paidAt: data.status === "PAID" ? new Date() : undefined,
      },
      include: fullInclude,
    });
  },
};
