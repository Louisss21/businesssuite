import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty } from "@/components/ui";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { DeleteButton } from "@/components/DeleteButton";
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
            <Th className="text-right">Aktionen</Th>
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
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/crm/${c.id}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Bearbeiten"
                  >
                    ✎
                  </Link>
                  <DeleteButton
                    url={`/api/customers/${c.id}`}
                    confirmText={`Kunde „${displayName(c)}" wirklich löschen?`}
                    iconOnly
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {customers.length === 0 && <Empty>Noch keine Kunden angelegt.</Empty>}
    </>
  );
}
