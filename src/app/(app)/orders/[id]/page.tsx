import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Table, Th, Td, Badge, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { orderService } from "@/modules/orders/order.service";
import { displayName } from "@/modules/crm/customer.service";
import { OrderActions } from "./OrderActions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await orderService.getById(params.id).catch(() => null);
  if (!order) notFound();

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        subtitle={displayName(order.customer)}
        action={<LinkButton href="/orders" variant="ghost">← Zurück</LinkButton>}
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

      <Table>
        <thead>
          <tr>
            <Th>Produkt</Th>
            <Th className="text-right">Menge</Th>
            <Th className="text-right">Einzelpreis</Th>
            <Th className="text-right">MwSt</Th>
            <Th className="text-right">Netto</Th>
            <Th className="text-right">Brutto</Th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id}>
              <Td>{it.productName}</Td>
              <Td className="text-right">{String(it.quantity)}</Td>
              <Td className="text-right">{formatEUR(it.unitPrice)}</Td>
              <Td className="text-right">{String(it.taxRate)}%</Td>
              <Td className="text-right">{formatEUR(it.netAmount)}</Td>
              <Td className="text-right">{formatEUR(it.grossAmount)}</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <Td className="text-right" >Summe</Td>
            <Td></Td>
            <Td></Td>
            <Td></Td>
            <Td className="text-right">{formatEUR(order.netTotal)}</Td>
            <Td className="text-right">{formatEUR(order.grossTotal)}</Td>
          </tr>
        </tfoot>
      </Table>
    </>
  );
}
