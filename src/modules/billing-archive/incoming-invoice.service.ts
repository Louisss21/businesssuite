import { prisma } from "@/lib/db";
import { z } from "zod";
import { notFound } from "@/lib/http";
import { monthsOfQuarter } from "./period";

/**
 * A6.1: Eingangsrechnungen (Lieferantenrechnungen). Eigene Tabelle, getrennt
 * von den Ausgangsrechnungen. Perioden (Jahr/Quartal/Monat) werden über
 * invoiceDate-Bereiche gefiltert.
 */

export const incomingInvoiceSchema = z.object({
  supplierName: z.string().trim().min(1, "Lieferant erforderlich"),
  invoiceNo: z.string().trim().optional().or(z.literal("")),
  invoiceDate: z.coerce.date(),
  amountNet: z.coerce.number().min(0).optional(),
  amountGross: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  status: z.enum(["OPEN", "PAID"]).default("OPEN"),
});

export type IncomingInvoiceInput = z.infer<typeof incomingInvoiceSchema>;

/** Datumsbereich [start, end) aus Jahr (+ optional Quartal/Monat). */
function dateRange(year: number, quarter?: number, month?: number) {
  let startMonth = 1;
  let endMonthExclusive = 13;
  if (month) {
    startMonth = month;
    endMonthExclusive = month + 1;
  } else if (quarter) {
    const ms = monthsOfQuarter(quarter);
    startMonth = ms[0];
    endMonthExclusive = ms[2] + 1;
  }
  const start = new Date(Date.UTC(year, startMonth - 1, 1));
  const end = new Date(Date.UTC(year, endMonthExclusive - 1, 1));
  return { start, end };
}

export const incomingInvoiceService = {
  /** Distinct Jahre, für die Eingangsrechnungen existieren (absteigend). */
  async years(): Promise<number[]> {
    const rows = await prisma.incomingInvoice.findMany({
      select: { invoiceDate: true },
      orderBy: { invoiceDate: "desc" },
    });
    const set = new Set<number>();
    for (const r of rows) set.add(r.invoiceDate.getUTCFullYear());
    return [...set].sort((a, b) => b - a);
  },

  list(filter: { year?: number; quarter?: number; month?: number; status?: string }) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.year) {
      const { start, end } = dateRange(filter.year, filter.quarter, filter.month);
      where.invoiceDate = { gte: start, lt: end };
    }
    return prisma.incomingInvoice.findMany({
      where,
      orderBy: { invoiceDate: "desc" },
    });
  },

  create(input: IncomingInvoiceInput, fileUrl: string, source: "MANUAL" | "EMAIL" = "MANUAL") {
    return prisma.incomingInvoice.create({
      data: {
        supplierName: input.supplierName,
        invoiceNo: input.invoiceNo || null,
        invoiceDate: input.invoiceDate,
        amountNet: input.amountNet ?? null,
        amountGross: input.amountGross ?? null,
        taxAmount: input.taxAmount ?? null,
        status: input.status,
        fileUrl,
        source,
      },
    });
  },

  async setStatus(id: string, status: "OPEN" | "PAID") {
    await this.getById(id);
    return prisma.incomingInvoice.update({ where: { id }, data: { status } });
  },

  async getById(id: string) {
    const row = await prisma.incomingInvoice.findUnique({ where: { id } });
    if (!row) throw notFound("Eingangsrechnung nicht gefunden");
    return row;
  },

  async remove(id: string) {
    await this.getById(id);
    return prisma.incomingInvoice.delete({ where: { id } });
  },
};
