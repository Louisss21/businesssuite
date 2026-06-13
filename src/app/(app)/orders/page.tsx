import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { orderService } from "@/modules/orders/order.service";
import { displayName } from "@/modules/crm/customer.service";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await orderService.list();
  return (
    <>
      <PageHeader
        title="Bestellungen"
        subtitle="Manuell erfasste Bestellungen"
        action={<LinkButton href="/orders/new">+ Neue Bestellung</LinkButton>}
      />
      <Table>
        <thead>
          <tr>
            <Th>Nummer</Th>
            <Th>Kunde</Th>
            <Th>Status</Th>
            <Th>Rechnung</Th>
            <Th className="text-right">Brutto</Th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <Td>
                <Link href={`/orders/${o.id}`} className="font-medium text-brand-700">
                  {o.orderNumber}
                </Link>
              </Td>
              <Td>{displayName(o.customer)}</Td>
              <Td>
                <Badge value={o.status} />
              </Td>
              <Td>
                {o.invoice ? (
                  <Link href={`/invoices/${o.invoice.id}`} className="text-brand-700">
                    {o.invoice.invoiceNumber}
                  </Link>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </Td>
              <Td className="text-right">{formatEUR(o.grossTotal)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {orders.length === 0 && <Empty>Noch keine Bestellungen.</Empty>}
    </>
  );
}
