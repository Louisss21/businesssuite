import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { customerService, displayName } from "@/modules/crm/customer.service";

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

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Stammdaten</h3>
          <dl className="space-y-2 text-sm">
            <Row label="E-Mail" value={customer.email} />
            <Row label="Telefon" value={customer.phone} />
            <Row
              label="Adresse"
              value={[customer.street, `${customer.postalCode ?? ""} ${customer.city ?? ""}`.trim()]
                .filter(Boolean)
                .join(", ")}
            />
            <Row label="USt-IdNr." value={customer.vatId} />
            <Row label="Steuernummer" value={customer.taxNumber} />
          </dl>
        </Card>

        <div className="col-span-2 space-y-6">
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

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value || "—"}</dd>
    </div>
  );
}
