import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty } from "@/components/ui";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { CustomerForm } from "./CustomerForm";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const customers = await customerService.list();
  return (
    <>
      <PageHeader title="CRM / Kunden" subtitle="Firmen- und Privatkunden" />
      <CustomerForm />
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Typ</Th>
            <Th>E-Mail</Th>
            <Th className="text-right">Bestellungen</Th>
            <Th className="text-right">Rechnungen</Th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <Td>
                <Link href={`/crm/${c.id}`} className="font-medium text-brand-700">
                  {displayName(c)}
                </Link>
              </Td>
              <Td>
                <Badge value={c.type === "COMPANY" ? "Firma" : "Privat"} />
              </Td>
              <Td>{c.email ?? "—"}</Td>
              <Td className="text-right">{c._count.orders}</Td>
              <Td className="text-right">{c._count.invoices}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {customers.length === 0 && <Empty>Noch keine Kunden angelegt.</Empty>}
    </>
  );
}
