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
  dunnings: { orderBy: { level: "asc" } },
} as const;

const DUNNING_FEES = [0, 5, 10]; // Stufe 1..3

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

  async delete(id: string) {
    await this.getById(id); // 404 wenn nicht vorhanden
    // InvoiceItems & Dunnings werden per Cascade mitgelöscht
    return prisma.invoice.delete({ where: { id } });
  },

  /** B2: Rechnungen löschen – bezahlte werden übersprungen (Storno statt Löschen). */
  async bulkDelete(ids: string[]) {
    const invs = await prisma.invoice.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true },
    });
    const deletable = invs.filter((i) => i.status !== "PAID").map((i) => i.id);
    const skipped = invs
      .filter((i) => i.status === "PAID")
      .map((i) => ({ id: i.id, reason: "bezahlt – bitte stornieren" }));
    let deleted = 0;
    if (deletable.length) {
      const res = await prisma.invoice.deleteMany({ where: { id: { in: deletable } } });
      deleted = res.count;
    }
    return { deleted, skipped };
  },

  /** B3: Massenstatus für Rechnungen (paidAt wird bei PAID gesetzt). */
  async bulkUpdate(ids: string[], changes: { status?: string }) {
    if (!changes.status) return { updated: 0 };
    const valid = ["OPEN", "PAID", "OVERDUE", "CANCELLED"];
    if (!valid.includes(changes.status)) throw new AppError("Ungültiger Status");
    const res = await prisma.invoice.updateMany({
      where: { id: { in: ids } },
      data: {
        status: changes.status as never,
        paidAt: changes.status === "PAID" ? new Date() : undefined,
      },
    });
    return { updated: res.count };
  },

  /** OPEN-Rechnungen mit überschrittenem Fälligkeitsdatum auf OVERDUE setzen. */
  markOverdue() {
    return prisma.invoice.updateMany({
      where: { status: "OPEN", isCancellation: false, dueDate: { lt: new Date() } },
      data: { status: "OVERDUE" },
    });
  },

  /** Mahnung für eine überfällige Rechnung erzeugen (Stufe steigt automatisch). */
  async createDunning(id: string) {
    const inv = await this.getById(id);
    if (inv.status !== "OVERDUE") {
      throw new AppError("Mahnungen sind nur für überfällige Rechnungen möglich.");
    }
    const existing = await prisma.dunning.count({ where: { invoiceId: id } });
    const level = Math.min(existing + 1, 3);
    const fee = DUNNING_FEES[level - 1] ?? 0;
    return prisma.dunning.create({
      data: {
        invoiceId: id,
        level,
        fee,
        sentAt: new Date(),
        dueDate: new Date(Date.now() + 7 * 86_400_000),
      },
    });
  },

  /** Rechnung stornieren: erzeugt eine Stornorechnung (negative Beträge), Original -> CANCELLED. */
  async cancel(id: string) {
    const inv = await this.getById(id);
    if (inv.isCancellation) throw new AppError("Eine Stornorechnung kann nicht storniert werden.");
    if (inv.status === "CANCELLED") throw new AppError("Rechnung ist bereits storniert.");

    const settings = await settingsService.get();
    const issued = new Date();
    const period = await accountingPeriodService.ensureForDate(issued);
    const year = issued.getFullYear();

    return prisma.$transaction(async (tx) => {
      const invoiceNumber = await nextNumber(tx, "invoice", year, settings.invoiceNumberFormat);
      const storno = await tx.invoice.create({
        data: {
          invoiceNumber,
          status: "PAID",
          isCancellation: true,
          originalInvoiceId: inv.id,
          customerId: inv.customerId,
          issueDate: issued,
          dueDate: issued,
          paidAt: issued,
          netTotal: inv.netTotal.negated(),
          taxTotal: inv.taxTotal.negated(),
          grossTotal: inv.grossTotal.negated(),
          accountingPeriodId: period.id,
          items: {
            create: inv.items.map((it) => ({
              productName: it.productName,
              quantity: it.quantity,
              unitPrice: it.unitPrice.negated(),
              taxRate: it.taxRate,
              netAmount: it.netAmount.negated(),
              taxAmount: it.taxAmount.negated(),
              grossAmount: it.grossAmount.negated(),
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: fullInclude,
      });
      await tx.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
      return storno;
    });
  },
};
