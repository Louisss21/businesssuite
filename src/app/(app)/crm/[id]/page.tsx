import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { CustomerInfoCard } from "./CustomerInfoCard";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const customer = await customerService.getById(params.id).catch(() => null);
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={displayName(customer)}
        subtitle={customer.type === "COMPANY" ? "Firmenkunde" : "Privatkunde"}
        action={<LinkButton href="/crm" variant="ghost">← Zurück</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CustomerInfoCard
            customer={{
              id: customer.id,
              type: customer.type,
              companyName: customer.companyName,
              firstName: customer.firstName,
              lastName: customer.lastName,
              email: customer.email,
              phone: customer.phone,
              street: customer.street,
              postalCode: customer.postalCode,
              city: customer.city,
              country: customer.country,
              shippingStreet: customer.shippingStreet,
              shippingZip: customer.shippingZip,
              shippingCity: customer.shippingCity,
              vatId: customer.vatId,
              taxNumber: customer.taxNumber,
              notes: customer.notes,
              classification: customer.classification,
              source: customer.source,
              newsletterOptIn: customer.newsletterOptIn,
            }}
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Bestellungen</h3>
            <Table>
              <thead>
                <tr>
                  <Th>Nummer</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Brutto</Th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o) => (
                  <tr key={o.id}>
                    <Td>
                      <Link href={`/orders/${o.id}`} className="text-brand-700">
                        {o.orderNumber}
                      </Link>
                    </Td>
                    <Td>
                      <Badge value={o.status} />
                    </Td>
                    <Td className="text-right">{formatEUR(o.grossTotal)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {customer.orders.length === 0 && <Empty>Keine Bestellungen.</Empty>}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Rechnungen</h3>
            <Table>
              <thead>
                <tr>
                  <Th>Nummer</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Brutto</Th>
                </tr>
              </thead>
              <tbody>
                {customer.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <Td>
                      <Link href={`/invoices/${inv.id}`} className="text-brand-700">
                        {inv.invoiceNumber}
                      </Link>
                    </Td>
                    <Td>
                      <Badge value={inv.status} />
                    </Td>
                    <Td className="text-right">{formatEUR(inv.grossTotal)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {customer.invoices.length === 0 && <Empty>Keine Rechnungen.</Empty>}
          </section>
        </div>
      </div>
    </>
  );
}
