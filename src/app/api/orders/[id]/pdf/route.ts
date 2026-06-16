import { createElement } from "react";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { orderService } from "@/modules/orders/order.service";
import { settingsService } from "@/modules/settings/settings.service";
import { displayName } from "@/modules/crm/customer.service";
import { loadLogoDataUri } from "@/modules/shared/pdf-logo";
import { OrderPdf, type OrderPdfData, type OrderPdfType } from "@/modules/orders/order-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const n = (v: unknown) => Number(v ?? 0);
const iso = (d: Date) => new Date(d).toLocaleDateString("de-DE");

const TYPES: Record<OrderPdfType, { title: string; showPrices: boolean }> = {
  confirmation: { title: "Auftragsbestätigung", showPrices: true },
  quote: { title: "Angebot", showPrices: true },
  deliverynote: { title: "Lieferschein", showPrices: false },
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const q = req.nextUrl.searchParams.get("type") ?? "confirmation";
    const type: OrderPdfType = q in TYPES ? (q as OrderPdfType) : "confirmation";
    const cfg = TYPES[type];

    const [order, settings] = await Promise.all([
      orderService.getById(params.id),
      settingsService.get(),
    ]);
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
        footer: settings.invoiceFooter,
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

    const element = createElement(OrderPdf, { data }) as unknown as Parameters<
      typeof renderToBuffer
    >[0];
    const buffer = await renderToBuffer(element);
    const body = new Uint8Array(buffer);

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${order.orderNumber}-${type}.pdf"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
