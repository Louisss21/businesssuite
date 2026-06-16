import Link from "next/link";
import { PageHeader, Table, Th, Td, Empty, LinkButton } from "@/components/ui";
import { leadService } from "@/modules/crm/lead.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { DeleteButton } from "@/components/DeleteButton";
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
      <PageHeader
        title="Leads"
        subtitle="Einfaches Lead-Management"
        action={<LinkButton href="/leads/import" variant="ghost">⬆ Import</LinkButton>}
      />
      <LeadForm customers={options} />
      <Table>
        <thead>
          <tr>
            <Th>Titel</Th>
            <Th>Kontakt</Th>
            <Th>Kunde</Th>
            <Th className="text-right">Score</Th>
            <Th>Status</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const contact =
              [l.firstName, l.lastName].filter(Boolean).join(" ") ||
              l.company ||
              l.email ||
              "—";
            return (
              <tr key={l.id}>
                <Td>
                  <Link href={`/leads/${l.id}`} className="font-medium text-brand-700">
                    {l.title}
                  </Link>
                </Td>
                <Td className="text-slate-600">{contact}</Td>
                <Td>{l.customer ? displayName(l.customer) : "—"}</Td>
                <Td className="text-right">{l.score}</Td>
                <Td>
                  <LeadStatusSelect id={l.id} status={l.status} />
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/leads/${l.id}`}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                      title="Bearbeiten"
                    >
                      ✎
                    </Link>
                    <DeleteButton
                      url={`/api/leads/${l.id}`}
                      confirmText={`Lead „${l.title}" wirklich löschen?`}
                      iconOnly
                    />
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {leads.length === 0 && <Empty>Noch keine Leads.</Empty>}
    </>
  );
}
