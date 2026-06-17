import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Badge, LinkButton } from "@/components/ui";
import { orderService } from "@/modules/orders/order.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { settingsService } from "@/modules/settings/settings.service";
import { productService } from "@/modules/products/product.service";
import { OrderActions } from "./OrderActions";
import { OrderForm } from "../OrderForm";
import { SendDocumentButton } from "@/components/SendDocumentButton";

export const dynamic = "force-dynamic";

const PDF_DOCS = [
  { type: "confirmation", label: "Auftragsbestätigung" },
  { type: "deliverynote", label: "Lieferschein" },
  { type: "quote", label: "Angebot" },
] as const;

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Manuell",
  PHONE: "Telefon",
  ONLINESHOP: "Online-Shop",
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-800">{value}</div>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await orderService.getById(params.id).catch(() => null);
  if (!order) notFound();

  const [customers, settings, products] = await Promise.all([
    customerService.list(),
    settingsService.get(),
    productService.listActiveSimple(),
  ]);
  const options = customers.map((c) => ({ id: c.id, name: displayName(c) }));

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        subtitle={displayName(order.customer)}
        action={
          <div className="flex flex-wrap gap-2">
            {PDF_DOCS.map((d) => (
              <a
                key={d.type}
                href={`/api/orders/${order.id}/pdf?type=${d.type}`}
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ⬇ {d.label}
              </a>
            ))}
            <SendDocumentButton kind="order" id={order.id} defaultEmail={order.customer.email} />
            <LinkButton href="/orders" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />

      <Card className="mb-6 flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Status:</span>
          <Badge value={order.status} />
        </div>
        <OrderActions
          id={order.id}
          status={order.status}
          hasInvoice={!!order.invoice}
          canInvoice={order.status !== "CANCELLED"}
        />
      </Card>

      {(order.source !== "MANUAL" ||
        order.hasUnmatchedSku ||
        order.paymentMethod ||
        order.lastDocSentAt) && (
        <Card className="mb-6 p-4 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            <Info label="Quelle" value={SOURCE_LABEL[order.source] ?? order.source} />
            {order.shopOrderNumber && <Info label="Shop-Bestellnr." value={order.shopOrderNumber} />}
            {order.paymentMethod && <Info label="Zahlart" value={order.paymentMethod} />}
            {order.paymentReference && <Info label="Zahlungsref." value={order.paymentReference} />}
            {order.paidAt && (
              <Info label="Bezahlt am" value={order.paidAt.toLocaleDateString("de-DE")} />
            )}
            {order.lastDocSentAt && (
              <Info
                label="Zuletzt gesendet"
                value={`${order.lastDocSentType ?? "Dokument"} · ${order.lastDocSentAt.toLocaleString("de-DE")}`}
              />
            )}
          </div>
          {order.hasUnmatchedSku && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
              ⚠ Mindestens eine Position ohne SKU-Treffer – der Bestand wurde dafür nicht
              reduziert. Bitte manuell prüfen.
            </p>
          )}
        </Card>
      )}

      {order.invoice && (
        <p className="mb-4 text-sm text-slate-600">
          Abgerechnet mit{" "}
          <Link href={`/invoices/${order.invoice.id}`} className="text-brand-700">
            {order.invoice.invoiceNumber}
          </Link>
        </p>
      )}

      <OrderForm
        customers={options}
        products={products}
        defaultTaxRate={Number(settings.defaultTaxRate)}
        hasInvoice={!!order.invoice}
        order={{
          id: order.id,
          customerId: order.customerId,
          status: order.status,
          notes: order.notes ?? "",
          items: order.items.map((it) => ({
            productName: it.productName,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            taxRate: Number(it.taxRate),
          })),
        }}
      />
    </>
  );
}
