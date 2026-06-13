import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { orderService } from "@/modules/orders/order.service";
import { displayName } from "@/modules/crm/customer.service";
import { DeleteButton } from "@/components/DeleteButton";

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
            <Th className="text-right">Aktionen</Th>
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
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/orders/${o.id}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Ansehen/Bearbeiten"
                  >
                    ✎
                  </Link>
                  <DeleteButton
                    url={`/api/orders/${o.id}`}
                    confirmText={`Bestellung ${o.orderNumber} wirklich löschen?`}
                    iconOnly
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {orders.length === 0 && <Empty>Noch keine Bestellungen.</Empty>}
    </>
  );
}
