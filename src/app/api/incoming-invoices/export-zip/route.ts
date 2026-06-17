import { NextRequest } from "next/server";
import JSZip from "jszip";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { incomingInvoiceService } from "@/modules/billing-archive/incoming-invoice.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Punkt 5.2: gefilterte Eingangsrechnungen als ZIP (Dateien + index.csv) herunterladen. */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const numParam = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
    const rows = await incomingInvoiceService.list({
      year: numParam("year"),
      quarter: numParam("quarter"),
      month: numParam("month"),
      status: sp.get("status") || undefined,
    });

    const zip = new JSZip();
    const csv = ["Lieferant;Nr;Datum;Netto;MwSt;Brutto;Status;Datei"];

    let i = 0;
    for (const r of rows) {
      i += 1;
      const dateStr = r.invoiceDate.toISOString().slice(0, 10);
      const rawExt = (r.fileUrl.split("?")[0].split(".").pop() ?? "pdf").toLowerCase();
      const ext = /^(pdf|png|jpe?g)$/.test(rawExt) ? rawExt : "pdf";
      const base = safe(`${dateStr}_${r.supplierName}_${r.invoiceNo ?? ""}`) || `beleg_${i}`;
      const filename = `${String(i).padStart(3, "0")}_${base}.${ext}`;

      try {
        const res = await fetch(r.fileUrl);
        if (res.ok) {
          zip.file(filename, Buffer.from(await res.arrayBuffer()));
        }
      } catch {
        // Datei nicht ladbar -> in CSV vermerkt, ZIP bleibt valide
      }

      csv.push(
        [
          r.supplierName,
          r.invoiceNo ?? "",
          dateStr,
          r.amountNet ?? "",
          r.taxAmount ?? "",
          r.amountGross ?? "",
          r.status,
          filename,
        ]
          .map(csvCell)
          .join(";"),
      );
    }

    zip.file("index.csv", "﻿" + csv.join("\r\n"));
    const out = await zip.generateAsync({ type: "nodebuffer" });

    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="eingangsrechnungen.zip"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
