import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { campaignService } from "@/modules/campaigns/campaign.service";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const campaigns = await campaignService.list();
  return (
    <>
      <PageHeader
        title="Kampagnen"
        subtitle="Direktmarketing – Post, E-Mail, Telefon"
        action={<LinkButton href="/campaigns/new">+ Neue Kampagne</LinkButton>}
      />
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Typ</Th>
            <Th>Status</Th>
            <Th>Zeitraum</Th>
            <Th className="text-right">Empfänger</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id}>
              <Td>
                <Link href={`/campaigns/${c.id}`} className="font-medium text-brand-700">
                  {c.name}
                </Link>
              </Td>
              <Td>{c.type}</Td>
              <Td><Badge value={c.status} /></Td>
              <Td className="text-slate-500">
                {c.startDate ? c.startDate.toLocaleDateString("de-DE") : "—"}
                {c.endDate ? ` – ${c.endDate.toLocaleDateString("de-DE")}` : ""}
              </Td>
              <Td className="text-right">{c._count.recipients}</Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/campaigns/${c.id}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Öffnen"
                  >
                    ✎
                  </Link>
                  <DeleteButton
                    url={`/api/campaigns/${c.id}`}
                    confirmText={`Kampagne „${c.name}" wirklich löschen?`}
                    iconOnly
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {campaigns.length === 0 && <Empty>Noch keine Kampagnen.</Empty>}
    </>
  );
}
