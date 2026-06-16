import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Badge, LinkButton } from "@/components/ui";
import { orderService } from "@/modules/orders/order.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { settingsService } from "@/modules/settings/settings.service";
import { productService } from "@/modules/products/product.service";
import { OrderActions } from "./OrderActions";
import { OrderForm } from "../OrderForm";

export const dynamic = "force-dynamic";

const PDF_DOCS = [
  { type: "confirmation", label: "Auftragsbestätigung" },
  { type: "deliverynote", label: "Lieferschein" },
  { type: "quote", label: "Angebot" },
] as const;

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
