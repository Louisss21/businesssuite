import { PageHeader } from "@/components/ui";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { CustomerForm } from "./CustomerForm";
import { CustomersTable } from "./CustomersTable";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const customers = await customerService.list();
  return (
    <>
      <PageHeader title="CRM / Kunden" subtitle="Firmen- und Privatkunden" />
      <CustomerForm />
      <CustomersTable
        customers={customers.map((c) => ({
          id: c.id,
          name: displayName(c),
          typeLabel: c.type === "COMPANY" ? "Firma" : "Privat",
          email: c.email ?? "",
          orders: c._count.orders,
          invoices: c._count.invoices,
        }))}
      />
    </>
  );
}
