import type { Prisma } from "@prisma/client";

/**
 * Erzeugt fortlaufende, pro Jahr eindeutige Belegnummern (Rechnungen, Bestellungen).
 * Läuft transaktional über NumberSequence -> garantiert lückenlos & kollisionsfrei.
 *
 * Format-Platzhalter:
 *   {YYYY}   -> Jahr 4-stellig
 *   {YY}     -> Jahr 2-stellig
 *   {SEQ}    -> laufende Nummer
 *   {SEQ:n}  -> laufende Nummer auf n Stellen mit führenden Nullen
 */
export function applyNumberFormat(
  format: string,
  year: number,
  seq: number,
): string {
  return format
    .replace(/\{YYYY\}/g, String(year))
    .replace(/\{YY\}/g, String(year).slice(-2))
    .replace(/\{SEQ:(\d+)\}/g, (_m, n) => String(seq).padStart(Number(n), "0"))
    .replace(/\{SEQ\}/g, String(seq));
}

/** Innerhalb einer Transaktion die nächste Nummer ziehen. */
export async function nextNumber(
  tx: Prisma.TransactionClient,
  scope: "invoice" | "order" | "quote",
  year: number,
  format: string,
): Promise<string> {
  const seqRow = await tx.numberSequence.upsert({
    where: { scope_year: { scope, year } },
    update: { value: { increment: 1 } },
    create: { scope, year, value: 1 },
  });
  return applyNumberFormat(format, year, seqRow.value);
}
