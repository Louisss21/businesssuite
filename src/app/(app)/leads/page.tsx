import { PageHeader, LinkButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { leadService } from "@/modules/crm/lead.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { userService } from "@/modules/users/user.service";
import { LeadForm } from "./LeadForm";
import { LeadsFilter } from "./LeadsFilter";
import { LeadsTable, type LeadRow } from "./LeadsTable";

export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: { assigned?: string; status?: string };
}) {
  const [me, leads, customers, users] = await Promise.all([
    getCurrentUser(),
    leadService.list({ status: searchParams?.status || undefined }),
    customerService.list(),
    userService.list(),
  ]);

  const options = customers.map((c) => ({ id: c.id, name: displayName(c) }));
  const userOptions = users
    .filter((u) => u.active)
    .map((u) => ({ id: u.id, name: u.name }));

  // Namensauflösung für die Zuständig-Spalte (inkl. inaktiver Nutzer,
  // damit alte Zuweisungen weiterhin lesbar bleiben).
  const userNames = new Map(users.map((u) => [u.id, u.name]));

  // Zuständigkeits-Filter: "me" = eigene Leads, "none" = ohne Zuweisung,
  // sonst konkrete Nutzer-ID. Status filtert bereits der Service.
  const assigned = searchParams?.assigned;
  const filtered = leads.filter((l) => {
    if (!assigned) return true;
    if (assigned === "me") return l.assignedUserId === me?.id;
    if (assigned === "none") return !l.assignedUserId;
    return l.assignedUserId === assigned;
  });

  const rows: LeadRow[] = filtered.map((l) => ({
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
    assignedUserId: l.assignedUserId,
    assignedName: l.assignedUserId ? (userNames.get(l.assignedUserId) ?? "Unbekannt") : null,
  }));

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Einfaches Lead-Management"
        action={<LinkButton href="/leads/import" variant="ghost">⬆ Import</LinkButton>}
      />
      <LeadForm customers={options} />
      <LeadsFilter users={userOptions} count={rows.length} />
      <LeadsTable rows={rows} users={userOptions} />
    </>
  );
}
