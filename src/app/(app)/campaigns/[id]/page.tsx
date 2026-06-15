import { notFound } from "next/navigation";
import { Card, PageHeader, Table, Th, Td, Empty, LinkButton, Badge } from "@/components/ui";
import { campaignService } from "@/modules/campaigns/campaign.service";
import { DeleteButton } from "@/components/DeleteButton";
import { TargetGroupBuilder } from "./TargetGroupBuilder";
import { CampaignControls } from "./CampaignControls";
import { RecipientActions } from "./RecipientActions";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const c = await campaignService.getById(params.id).catch(() => null);
  if (!c) notFound();

  const total = c.recipients.length;
  const responded = c.recipients.filter((r) => r.respondedAt).length;
  const converted = c.recipients.filter((r) => r.converted).length;
  const rate = total ? Math.round((responded / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={`Kampagne · ${c.type}`}
        action={
          <div className="flex flex-wrap gap-2">
            <DeleteButton
              url={`/api/campaigns/${c.id}`}
              confirmText={`Kampagne „${c.name}" wirklich löschen?`}
              redirectTo="/campaigns"
              label="Löschen"
            />
            <LinkButton href="/campaigns" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">Status:</span>
          <Badge value={c.status} />
        </div>
        <CampaignControls id={c.id} status={c.status} hasRecipients={total > 0} />
      </Card>

      {/* Kennzahlen */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4"><div className="text-sm text-slate-500">Empfänger</div><div className="mt-1 text-xl font-semibold">{total}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Antworten</div><div className="mt-1 text-xl font-semibold">{responded}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Konvertiert</div><div className="mt-1 text-xl font-semibold">{converted}</div></Card>
        <Card className="p-4"><div className="text-sm text-slate-500">Rücklaufquote</div><div className="mt-1 text-xl font-semibold">{rate}%</div></Card>
      </div>

      <div className="mb-6">
        <TargetGroupBuilder campaignId={c.id} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Empfänger</h2>
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Adresse</Th>
            <Th>Versendet</Th>
            <Th className="text-right">Rücklauf</Th>
          </tr>
        </thead>
        <tbody>
          {c.recipients.map((r) => (
            <tr key={r.id}>
              <Td className="font-medium text-slate-900">{r.name}</Td>
              <Td className="text-slate-500">{r.address || "—"}</Td>
              <Td>{r.sentAt ? new Date(r.sentAt).toLocaleDateString("de-DE") : "—"}</Td>
              <Td className="text-right">
                <RecipientActions
                  campaignId={c.id}
                  recipientId={r.id}
                  responded={!!r.respondedAt}
                  converted={r.converted}
                />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {total === 0 && <Empty>Noch keine Empfänger. Baue oben eine Zielgruppe auf.</Empty>}
    </>
  );
}
