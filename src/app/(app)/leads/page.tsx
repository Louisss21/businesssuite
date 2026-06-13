import { PageHeader, Table, Th, Td, Empty } from "@/components/ui";
import { leadService } from "@/modules/crm/lead.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { LeadForm } from "./LeadForm";
import { LeadStatusSelect } from "./LeadStatusSelect";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, customers] = await Promise.all([
    leadService.list(),
    customerService.list(),
  ]);

  const options = customers.map((c) => ({ id: c.id, name: displayName(c) }));

  return (
    <>
      <PageHeader title="Leads" subtitle="Einfaches Lead-Management" />
      <LeadForm customers={options} />
      <Table>
        <thead>
          <tr>
            <Th>Titel</Th>
            <Th>Kunde</Th>
            <Th>Notizen</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <Td className="font-medium text-slate-900">{l.title}</Td>
              <Td>{l.customer ? displayName(l.customer) : "—"}</Td>
              <Td className="max-w-xs truncate text-slate-500">{l.notes ?? "—"}</Td>
              <Td>
                <LeadStatusSelect id={l.id} status={l.status} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {leads.length === 0 && <Empty>Noch keine Leads.</Empty>}
    </>
  );
}
