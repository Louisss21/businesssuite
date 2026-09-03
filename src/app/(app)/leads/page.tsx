import { cookies } from "next/headers";
import { PageHeader, LinkButton } from "@/components/ui";
import { leadService } from "@/modules/crm/lead.service";
import { leadStatuses } from "@/modules/crm/lead.schema";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { userService } from "@/modules/users/user.service";
import { LeadForm } from "./LeadForm";
import { LeadsFilter, LEADS_FILTER_COOKIE } from "./LeadsFilter";
import { LeadsTable, type LeadRow } from "./LeadsTable";

export const dynamic = "force-dynamic";

/**
 * Effektiver Filter: Parameter aus der URL haben Vorrang. Enthält die URL
 * keinen der beiden Parameter (z. B. Aufruf über die Navigation), greift der
 * gemerkte Filter aus dem Cookie – so überlebt die Auswahl einen Seitenwechsel.
 * Ein ungültiger Status aus einem alten Cookie wird verworfen, damit eine
 * veraltete Auswahl die Seite nicht mit einem Enum-Fehler abbricht.
 */
function resolveFilter(searchParams?: { assigned?: string; status?: string }) {
  const fromUrl =
    searchParams?.assigned !== undefined || searchParams?.status !== undefined;
  let assigned = searchParams?.assigned ?? "";
  let status = searchParams?.status ?? "";

  if (!fromUrl) {
    const saved = cookies().get(LEADS_FILTER_COOKIE)?.value;
    if (saved) {
      const q = new URLSearchParams(decodeURIComponent(saved));
      assigned = q.get("assigned") ?? "";
      status = q.get("status") ?? "";
    }
  }
  if (status && !leadStatuses.includes(status as never)) status = "";
  return { assigned, status };
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams?: { assigned?: string; status?: string };
}) {
  const { assigned, status } = resolveFilter(searchParams);

  const [leads, customers, users] = await Promise.all([
    leadService.list({ status: status || undefined }),
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

  // Zuständigkeits-Filter: "none" = ohne Zuweisung, sonst konkrete
  // Nutzer-ID. Status filtert bereits der Service.
  const filtered = leads.filter((l) => {
    if (!assigned) return true;
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
      <LeadsFilter
        users={userOptions}
        count={rows.length}
        assigned={assigned}
        status={status}
      />
      <LeadsTable rows={rows} users={userOptions} />
    </>
  );
}
