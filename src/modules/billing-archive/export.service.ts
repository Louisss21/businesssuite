import { displayName } from "@/modules/crm/customer.service";
import { archiveService } from "./archive.service";

/**
 * Export-Vorbereitung. Liefert ein flaches, export-ready Datenmodell
 * (eine Zeile je Rechnung) mit getrennten Netto/Steuer/Brutto-Werten und
 * vollständigen Kundendaten.
 *
 * -> CSV ist bereits implementiert.
 * -> DATEV: die Struktur (ExportRow) enthält alle Pflichtfelder. Ein späterer
 *    DATEV-Adapter (EXTF/Buchungsstapel) mappt ExportRow nur noch auf das
 *    DATEV-CSV-Format – KEINE Änderung am Datenmodell nötig.
 */

export interface ExportRow {
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  status: string;
  year: number;
  quarter: number;
  month: number;
  customerName: string;
  customerVatId: string;
  customerTaxNumber: string;
  netTotal: string;
  taxTotal: string;
  grossTotal: string;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const exportService = {
  async rows(filter: {
    year: number;
    quarter?: number;
    month?: number;
    customerId?: string;
    status?: string;
  }): Promise<ExportRow[]> {
    const invoices = await archiveService.invoicesInPeriod(filter);
    return invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      issueDate: iso(inv.issueDate),
      dueDate: iso(inv.dueDate),
      status: inv.status,
      year: inv.accountingPeriod.year,
      quarter: inv.accountingPeriod.quarter,
      month: inv.accountingPeriod.month,
      customerName: displayName(inv.customer),
      customerVatId: inv.customer.vatId ?? "",
      customerTaxNumber: inv.customer.taxNumber ?? "",
      netTotal: inv.netTotal.toFixed(2),
      taxTotal: inv.taxTotal.toFixed(2),
      grossTotal: inv.grossTotal.toFixed(2),
    }));
  },

  toCSV(rows: ExportRow[]): string {
    const headers: (keyof ExportRow)[] = [
      "invoiceNumber",
      "issueDate",
      "dueDate",
      "status",
      "year",
      "quarter",
      "month",
      "customerName",
      "customerVatId",
      "customerTaxNumber",
      "netTotal",
      "taxTotal",
      "grossTotal",
    ];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(";")];
    for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(";"));
    return lines.join("\r\n");
  },
};
