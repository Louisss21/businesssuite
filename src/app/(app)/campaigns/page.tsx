import { PageHeader, LinkButton } from "@/components/ui";
import { campaignService } from "@/modules/campaigns/campaign.service";
import { BulkTable, type BulkColumn, type BulkRow } from "@/components/bulk/BulkTable";
import type { BulkField } from "@/components/bulk/BulkUI";

export const dynamic = "force-dynamic";

const COLUMNS: BulkColumn[] = [
  { key: "name", header: "Name", type: "link", hrefBase: "/campaigns/" },
  { key: "type", header: "Typ" },
  { key: "status", header: "Status", type: "badge" },
  { key: "zeitraum", header: "Zeitraum" },
  { key: "recipients", header: "Empfänger", align: "right" },
];

const CHANGE_FIELDS: BulkField[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"].map((s) => ({ value: s, label: s })),
  },
];

export default async function CampaignsPage() {
  const campaigns = await campaignService.list();

  const rows: BulkRow[] = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    zeitraum:
      (c.startDate ? c.startDate.toLocaleDateString("de-DE") : "—") +
      (c.endDate ? ` – ${c.endDate.toLocaleDateString("de-DE")}` : ""),
    recipients: c._count.recipients,
  }));

  return (
    <>
      <PageHeader
        title="Kampagnen"
        subtitle="Direktmarketing – Post, E-Mail, Telefon"
        action={<LinkButton href="/campaigns/new">+ Neue Kampagne</LinkButton>}
      />
      <BulkTable
        rows={rows}
        columns={COLUMNS}
        editHrefBase="/campaigns/"
        deleteUrlBase="/api/campaigns/"
        labelKey="name"
        deleteNoun="Kampagne(n)"
        bulkDeleteUrl="/api/campaigns/bulk-delete"
        bulkUpdateUrl="/api/campaigns/bulk-update"
        changeFields={CHANGE_FIELDS}
        emptyText="Noch keine Kampagnen."
      />
    </>
  );
}
