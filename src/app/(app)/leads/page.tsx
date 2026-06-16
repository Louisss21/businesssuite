import { PageHeader, LinkButton } from "@/components/ui";
import { leadService } from "@/modules/crm/lead.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { userService } from "@/modules/users/user.service";
import { LeadForm } from "./LeadForm";
import { LeadsTable, type LeadRow } from "./LeadsTable";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const [leads, customers, users] = await Promise.all([
    leadService.list(),
    customerService.list(),
    userService.list(),
  ]);

  const options = customers.map((c) => ({ id: c.id, name: displayName(c) }));
  const userOptions = users
    .filter((u) => u.active)
    .map((u) => ({ id: u.id, name: u.name }));

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    title: l.title,
    status: l.status,
    score: l.score,
    contact:
      [l.firstName, l.lastName].filter(Boolean).join(" ") ||
      l.company ||
      l.email ||
      "—",
    customerName: l.customer ? displayName(l.customer) : null,
  }));

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Einfaches Lead-Management"
        action={<LinkButton href="/leads/import" variant="ghost">⬆ Import</LinkButton>}
      />
      <LeadForm customers={options} />
      <LeadsTable rows={rows} users={userOptions} />
    </>
  );
}
