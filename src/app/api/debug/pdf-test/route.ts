import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { settingsService } from "@/modules/settings/settings.service";
import { displayName } from "@/modules/crm/customer.service";
import { loadLogoDataUri } from "@/modules/shared/pdf-logo";
import { InvoicePdf, type InvoicePdfData } from "@/modules/invoices/invoice-pdf";
import { QuotePdf, type QuotePdfData } from "@/modules/quotes/quote-pdf";
import { computeQuoteItem } from "@/modules/quotes/quote.schema";

// TEMPORÄR: reproduziert die echte PDF-Generierung am ersten Datensatz, um den 503 zu finden.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const n = (v: unknown) => Number(v ?? 0);
const iso = (d: Date) => new Date(d).toLocaleDateString("de-DE");

async function tryRender(name: string, fn: () => Promise<Buffer>) {
  try {
    const buf = await fn();
    return { name, status: "ok", bytes: buf.length };
  } catch (e) {
    return {
      name,
      status: "ERROR",
      message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.split("\n").slice(0, 6).join(" | ") : undefined,
    };
  }
}

export async function GET() {
  const settings = await settingsService.get();
  const results: unknown[] = [];
  results.push({ logoUrl: settings.logoUrl || "(leer)" });

  // Logo-Laden isoliert testen
  results.push(
    await tryRender("loadLogo", async () => {
      const uri = await loadLogoDataUri(settings.logoUrl);
      return Buffer.from(uri ? "has-logo" : "no-logo");
    }),
  );

  const logoDataUri = await loadLogoDataUri(settings.logoUrl).catch(() => undefined);

  // Invoice
  const invoice = await prisma.invoice.findFirst({
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
  });
  if (invoice) {
    results.push(
      await tryRender("invoice", async () => {
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
        const el = createElement(InvoicePdf, { data }) as unknown as Parameters<typeof renderToBuffer>[0];
        return renderToBuffer(el);
      }),
    );
  } else {
    results.push({ name: "invoice", status: "no-record" });
  }

  // Quote
  const quote = await prisma.quote.findFirst({
    include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  if (quote) {
    results.push(
      await tryRender("quote", async () => {
        const data: QuotePdfData = {
          number: quote.number,
          issueDate: iso(quote.createdAt),
          validUntil: quote.validUntil ? iso(quote.validUntil) : null,
          netTotal: n(quote.netTotal),
          taxTotal: n(quote.taxTotal),
          grossTotal: n(quote.grossTotal),
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
        const el = createElement(QuotePdf, { data }) as unknown as Parameters<typeof renderToBuffer>[0];
        return renderToBuffer(el);
      }),
    );
  } else {
    results.push({ name: "quote", status: "no-record" });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}
