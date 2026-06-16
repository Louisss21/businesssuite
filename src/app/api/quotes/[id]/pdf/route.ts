import { createElement } from "react";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { quoteService } from "@/modules/quotes/quote.service";
import { computeQuoteItem } from "@/modules/quotes/quote.schema";
import { settingsService } from "@/modules/settings/settings.service";
import { displayName } from "@/modules/crm/customer.service";
import { loadLogoDataUri } from "@/modules/shared/pdf-logo";
import { QuotePdf, type QuotePdfData } from "@/modules/quotes/quote-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const iso = (d: Date) => new Date(d).toLocaleDateString("de-DE");

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const [quote, settings] = await Promise.all([
      quoteService.getById(params.id),
      settingsService.get(),
    ]);
    const logoDataUri = await loadLogoDataUri(settings.logoUrl);

    const data: QuotePdfData = {
      number: quote.number,
      issueDate: iso(quote.createdAt),
      validUntil: quote.validUntil ? iso(quote.validUntil) : null,
      netTotal: Number(quote.netTotal),
      taxTotal: Number(quote.taxTotal),
      grossTotal: Number(quote.grossTotal),
      notes: quote.notes ?? null,
      company: {
        companyName: settings.companyName,
        street: settings.street,
        postalCode: settings.postalCode,
        city: settings.city,
        email: settings.email,
        phone: settings.phone,
        taxNumber: settings.taxNumber,
        vatId: settings.vatId,
        footer: settings.invoiceFooter,
        logoDataUri,
      },
      customer: {
        name: displayName(quote.customer),
        street: quote.customer.street ?? "",
        postalCode: quote.customer.postalCode ?? "",
        city: quote.customer.city ?? "",
        vatId: quote.customer.vatId ?? "",
      },
      items: quote.items.map((it) => {
        const amt = computeQuoteItem({
          qty: it.qty,
          unitPrice: it.unitPrice,
          discountPct: it.discountPct,
          taxRate: it.taxRate,
        });
        return {
          name: it.name,
          qty: it.qty,
          unitPrice: it.unitPrice,
          discountPct: it.discountPct,
          taxRate: it.taxRate,
          netAmount: amt.net,
          grossAmount: amt.gross,
        };
      }),
    };

    const element = createElement(QuotePdf, { data }) as unknown as Parameters<
      typeof renderToBuffer
    >[0];
    const buffer = await renderToBuffer(element);
    const body = new Uint8Array(buffer);

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quote.number}.pdf"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
