import { prisma } from "@/lib/db";
import { periodFromDate } from "./period";

/**
 * Verwaltet AccountingPeriod-Datensätze. Jede Rechnung wird beim Anlegen
 * automatisch einer (year, month)-Periode zugeordnet – on demand erzeugt.
 */
export const accountingPeriodService = {
  /** Periode für ein Datum finden oder anlegen (idempotent). */
  async ensureForDate(date: Date) {
    const { year, month, quarter, label } = periodFromDate(date);
    return prisma.accountingPeriod.upsert({
      where: { year_month: { year, month } },
      update: {},
      create: { year, month, quarter, label },
    });
  },
};
