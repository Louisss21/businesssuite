import { createElement } from "react";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { settingsService } from "@/modules/settings/settings.service";
import { displayName } from "@/modules/crm/customer.service";
import { InvoicePdf, type InvoicePdfData } from "@/modules/invoices/invoice-pdf";
import { loadLogoDataUri } from "@/modules/shared/pdf-logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Headroom gegen Cold-Start-Timeouts (Hobby-Default sind nur 10s).
export const maxDuration = 60;

const n = (v: unknown) => Number(v ?? 0);
const iso = (d: Date) => new Date(d).toLocaleDateString("de-DE");

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const [invoice, settings] = await Promise.all([
      invoiceService.getById(params.id),
      settingsService.get(),
    ]);
    const logoDataUri = await loadLogoDataUri(settings.logoUrl);

    const data: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: iso(invoice.issueDate),
      dueDate: iso(invoice.dueDate),
      netTotal: n(invoice.netTotal),
      taxTotal: n(invoice.taxTotal),
      grossTotal: n(invoice.grossTotal),
      isCancellation: invoice.isCancellation,
      company: {
        companyName: settings.companyName,
        street: settings.street,
        postalCode: settings.postalCode,
        city: settings.city,
        email: settings.email,
        phone: settings.phone,
        taxNumber: settings.taxNumber,
        vatId: settings.vatId,
        bankName: settings.bankName,
        iban: settings.iban,
        bic: settings.bic,
        footer: settings.invoiceFooter,
        logoDataUri,
      },
      customer: {
        name: displayName(invoice.customer),
        street: invoice.customer.street ?? "",
        postalCode: invoice.customer.postalCode ?? "",
        city: invoice.customer.city ?? "",
        vatId: invoice.customer.vatId ?? "",
      },
      items: invoice.items.map((it) => ({
        productName: it.productName,
        quantity: n(it.quantity),
        unitPrice: n(it.unitPrice),
        taxRate: n(it.taxRate),
        netAmount: n(it.netAmount),
        grossAmount: n(it.grossAmount),
      })),
    };

    // createElement statt JSX (Datei ist .ts); Cast auf den exakten Parametertyp
    const element = createElement(InvoicePdf, { data }) as unknown as Parameters<
      typeof renderToBuffer
    >[0];
    const buffer = await renderToBuffer(element);
    // Buffer -> Uint8Array, damit der Web-Response-BodyInit-Typ passt
    const body = new Uint8Array(buffer);

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Rechnung-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
