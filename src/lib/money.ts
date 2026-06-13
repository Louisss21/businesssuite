import { Prisma } from "@prisma/client";

/**
 * Geld-/Rechenlogik zentral. Wir nutzen Prisma.Decimal, um Float-Rundungs-
 * fehler zu vermeiden. Alle Beträge werden auf 2 Nachkommastellen gerundet.
 */
export type Decimal = Prisma.Decimal;
export const D = (v: Prisma.Decimal.Value): Decimal => new Prisma.Decimal(v);

export const round2 = (v: Decimal): Decimal =>
  v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

export interface LineInput {
  quantity: Prisma.Decimal.Value;
  unitPrice: Prisma.Decimal.Value;
  taxRate: Prisma.Decimal.Value;
}

export interface LineAmounts {
  netAmount: Decimal;
  taxAmount: Decimal;
  grossAmount: Decimal;
}

/** Beträge einer einzelnen Position berechnen (Netto/Steuer/Brutto getrennt). */
export function computeLineAmounts(line: LineInput): LineAmounts {
  const net = round2(D(line.quantity).mul(D(line.unitPrice)));
  const tax = round2(net.mul(D(line.taxRate)).div(100));
  const gross = round2(net.add(tax));
  return { netAmount: net, taxAmount: tax, grossAmount: gross };
}

export interface Totals {
  netTotal: Decimal;
  taxTotal: Decimal;
  grossTotal: Decimal;
}

/** Summen über mehrere Positionen aggregieren. */
export function sumTotals(lines: LineAmounts[]): Totals {
  return lines.reduce<Totals>(
    (acc, l) => ({
      netTotal: round2(acc.netTotal.add(l.netAmount)),
      taxTotal: round2(acc.taxTotal.add(l.taxAmount)),
      grossTotal: round2(acc.grossTotal.add(l.grossAmount)),
    }),
    { netTotal: D(0), taxTotal: D(0), grossTotal: D(0) },
  );
}

/** Anzeige-Formatierung (EUR). */
export function formatEUR(v: Prisma.Decimal.Value): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(Number(v));
}
