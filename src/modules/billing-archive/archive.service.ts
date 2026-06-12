import { prisma } from "@/lib/db";
import { D, type Decimal } from "@/lib/money";
import { MONTH_NAMES_DE, monthsOfQuarter, quarterOfMonth } from "./period";

/**
 * Stellt die logische Buchhaltungs-Ordnerstruktur bereit:
 *   Jahr -> Quartal -> Monat  (mit aggregierten Netto/Steuer/Brutto-Summen)
 * sowie gefilterte Rechnungslisten und exportierbare Datensätze.
 */

export interface SumBucket {
  net: Decimal;
  tax: Decimal;
  gross: Decimal;
  count: number;
}

const emptyBucket = (): SumBucket => ({ net: D(0), tax: D(0), gross: D(0), count: 0 });

/** Mehrere Buckets additiv zusammenführen (Jahr/Quartal aus Monaten). */
function mergeBuckets(buckets: SumBucket[]): SumBucket {
  return buckets.reduce((acc, b) => {
    acc.net = acc.net.add(b.net);
    acc.tax = acc.tax.add(b.tax);
    acc.gross = acc.gross.add(b.gross);
    acc.count += b.count;
    return acc;
  }, emptyBucket());
}

export interface MonthNode {
  month: number;
  name: string;
  sums: SumBucket;
}
export interface QuarterNode {
  quarter: number;
  label: string;
  sums: SumBucket;
  months: MonthNode[];
}
export interface YearNode {
  year: number;
  sums: SumBucket;
  quarters: QuarterNode[];
}

export const archiveService = {
  /** Liste aller Jahre, für die Perioden/Rechnungen existieren. */
  async years(): Promise<number[]> {
    const rows = await prisma.accountingPeriod.findMany({
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    });
    return rows.map((r) => r.year);
  },

  /** Vollständiger Aggregations-Baum eines Jahres (Quartal -> Monat). */
  async yearTree(year: number): Promise<YearNode> {
    const invoices = await prisma.invoice.findMany({
      where: { accountingPeriod: { year } },
      select: {
        netTotal: true,
        taxTotal: true,
        grossTotal: true,
        accountingPeriod: { select: { month: true } },
      },
    });

    const monthBuckets = new Map<number, SumBucket>();
    for (let m = 1; m <= 12; m++) monthBuckets.set(m, emptyBucket());

    for (const inv of invoices) {
      const b = monthBuckets.get(inv.accountingPeriod.month)!;
      b.net = b.net.add(inv.netTotal);
      b.tax = b.tax.add(inv.taxTotal);
      b.gross = b.gross.add(inv.grossTotal);
      b.count += 1;
    }

    const quarters: QuarterNode[] = [1, 2, 3, 4].map((q) => {
      const months: MonthNode[] = monthsOfQuarter(q).map((m) => ({
        month: m,
        name: MONTH_NAMES_DE[m - 1],
        sums: monthBuckets.get(m)!,
      }));
      return {
        quarter: q,
        label: `Q${q}_${year}`,
        sums: mergeBuckets(months.map((m) => m.sums)),
        months,
      };
    });

    return { year, sums: mergeBuckets(quarters.map((q) => q.sums)), quarters };
  },

  /**
   * Gefilterte Rechnungen für Archiv-Ansicht & Export.
   * Ohne month/quarter -> ganzes Jahr; mit quarter -> dessen 3 Monate.
   */
  invoicesInPeriod(filter: {
    year: number;
    quarter?: number;
    month?: number;
    customerId?: string;
    status?: string;
  }) {
    const monthFilter =
      filter.month !== undefined
        ? filter.month
        : filter.quarter !== undefined
          ? { in: monthsOfQuarter(filter.quarter) }
          : undefined;

    return prisma.invoice.findMany({
      where: {
        status: filter.status as never,
        customerId: filter.customerId,
        accountingPeriod: { year: filter.year, month: monthFilter as never },
      },
      orderBy: { issueDate: "asc" },
      include: { customer: true, accountingPeriod: true },
    });
  },
};

export const scopeLabel = (f: { year: number; quarter?: number; month?: number }) => {
  if (f.month) return `${MONTH_NAMES_DE[f.month - 1]} ${f.year}`;
  if (f.quarter) return `Q${f.quarter} ${f.year}`;
  return `Jahr ${f.year}`;
};

export { quarterOfMonth };
