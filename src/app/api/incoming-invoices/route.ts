import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok } from "@/lib/http";
import {
  incomingInvoiceSchema,
  incomingInvoiceService,
} from "@/modules/billing-archive/incoming-invoice.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const num = (v: FormDataEntryValue | null) =>
  v === null || v === "" ? undefined : String(v);

/** A6.1: Eingangsrechnung hochladen (Datei + Metadaten). */
export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("Keine Datei übermittelt");
    if (!ALLOWED.includes(file.type)) throw new AppError("Nur PDF, PNG oder JPG erlaubt");
    if (file.size > MAX_BYTES) throw new AppError("Datei zu groß (max. 10 MB)");

    const meta = incomingInvoiceSchema.parse({
      supplierName: form.get("supplierName"),
      invoiceNo: num(form.get("invoiceNo")),
      invoiceDate: form.get("invoiceDate"),
      amountNet: num(form.get("amountNet")),
      amountGross: num(form.get("amountGross")),
      taxAmount: num(form.get("taxAmount")),
      status: (num(form.get("status")) as "OPEN" | "PAID") ?? "OPEN",
    });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(`incoming-invoices/${Date.now()}-${safeName}`, file, {
      access: "public",
      contentType: file.type,
    });

    const created = await incomingInvoiceService.create(meta, blob.url, "MANUAL");
    return ok(created, 201);
  } catch (e) {
    return fail(e);
  }
}

/** Gefilterte Liste (year/quarter/month/status). */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const numParam = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
    const data = await incomingInvoiceService.list({
      year: numParam("year"),
      quarter: numParam("quarter"),
      month: numParam("month"),
      status: sp.get("status") || undefined,
    });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
}
