import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { quoteService } from "@/modules/quotes/quote.service";
import { orderService } from "@/modules/orders/order.service";
import { settingsService, footerForRole } from "@/modules/settings/settings.service";
import { displayName } from "@/modules/crm/customer.service";
import { loadLogoDataUri } from "@/modules/shared/pdf-logo";
import { computeQuoteItem } from "@/modules/quotes/quote.schema";
import { InvoicePdf, type InvoicePdfData } from "@/modules/invoices/invoice-pdf";
import { QuotePdf, type QuotePdfData } from "@/modules/quotes/quote-pdf";
import { OrderPdf, type OrderPdfData, type OrderPdfType } from "@/modules/orders/order-pdf";

/**
 * Zentrale PDF-Erzeugung – genutzt von den Download-Routen UND dem
 * E-Mail-Versand. So bleiben Beleg-Layout/Daten überall identisch.
 */

export interface RenderedPdf {
  buffer: Buffer;
  filename: string;
  /** E-Mail des Kunden (für Versand vorbefüllen). */
  customerEmail: string | null;
  /** sprechender Titel des Belegs (für Betreff). */
  docLabel: string;
  /** Belegnummer. */
  number: string;
}

const n = (v: unknown) => Number(v ?? 0);
const iso = (d: Date) => new Date(d).toLocaleDateString("de-DE");

async function render(element: unknown): Promise<Buffer> {
  const buf = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
  return buf;
}

export async function generateInvoicePdf(id: string, role?: string | null): Promise<RenderedPdf> {
  const [invoice, settings] = await Promise.all([invoiceService.getById(id), settingsService.get()]);
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
      footer: footerForRole(settings, role),
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
  const buffer = await render(createElement(InvoicePdf, { data }));
  const label = invoice.isCancellation ? "Stornorechnung" : "Rechnung";
  return {
    buffer,
    filename: `${label}-${invoice.invoiceNumber}.pdf`,
    customerEmail: invoice.customer.email ?? null,
    docLabel: label,
    number: invoice.invoiceNumber,
  };
}

export async function generateQuotePdf(id: string, role?: string | null): Promise<RenderedPdf> {
  const [quote, settings] = await Promise.all([quoteService.getById(id), settingsService.get()]);
  const logoDataUri = await loadLogoDataUri(settings.logoUrl);
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
      footer: footerForRole(settings, role),
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
  const buffer = await render(createElement(QuotePdf, { data }));
  return {
    buffer,
    filename: `Angebot-${quote.number}.pdf`,
    customerEmail: quote.customer.email ?? null,
    docLabel: "Angebot",
    number: quote.number,
  };
}

const ORDER_TYPES: Record<OrderPdfType, { title: string; showPrices: boolean }> = {
  confirmation: { title: "Auftragsbestätigung", showPrices: true },
  quote: { title: "Angebot", showPrices: true },
  deliverynote: { title: "Lieferschein", showPrices: false },
};

export async function generateOrderPdf(id: string, type: OrderPdfType, role?: string | null): Promise<RenderedPdf> {
  const cfg = ORDER_TYPES[type];
  const [order, settings] = await Promise.all([orderService.getById(id), settingsService.get()]);
  const logoDataUri = await loadLogoDataUri(settings.logoUrl);
  const cust = order.customer;
  const data: OrderPdfData = {
    type,
    title: cfg.title,
    number: order.orderNumber,
    issueDate: iso(order.createdAt),
    showPrices: cfg.showPrices,
    netTotal: n(order.netTotal),
    taxTotal: n(order.taxTotal),
    grossTotal: n(order.grossTotal),
    notes: order.notes ?? null,
    company: {
      companyName: settings.companyName,
      street: settings.street,
      postalCode: settings.postalCode,
      city: settings.city,
      email: settings.email,
      phone: settings.phone,
      taxNumber: settings.taxNumber,
      vatId: settings.vatId,
      footer: footerForRole(settings, role),
      logoDataUri,
    },
    customer: {
      name: displayName(cust),
      street: cust.street ?? "",
      postalCode: cust.postalCode ?? "",
      city: cust.city ?? "",
      vatId: cust.vatId ?? "",
    },
    shipping: {
      name: displayName(cust),
      street: cust.shippingStreet || cust.street || "",
      postalCode: cust.shippingZip || cust.postalCode || "",
      city: cust.shippingCity || cust.city || "",
    },
    items: order.items.map((it) => ({
      productName: it.productName,
      quantity: n(it.quantity),
      unitPrice: n(it.unitPrice),
      taxRate: n(it.taxRate),
      netAmount: n(it.netAmount),
      grossAmount: n(it.grossAmount),
    })),
  };
  const buffer = await render(createElement(OrderPdf, { data }));
  return {
    buffer,
    filename: `${cfg.title}-${order.orderNumber}.pdf`,
    customerEmail: cust.email ?? null,
    docLabel: cfg.title,
    number: order.orderNumber,
  };
}
