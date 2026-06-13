import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import { leadService } from "@/modules/crm/lead.service";
import { LeadDetailForm } from "./LeadDetailForm";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await leadService.getById(params.id).catch(() => null);
  if (!lead) notFound();

  return (
    <>
      <PageHeader
        title={lead.title}
        subtitle="Lead-Detail"
        action={
          <div className="flex flex-wrap gap-2">
            <DeleteButton
              url={`/api/leads/${lead.id}`}
              confirmText={`Lead „${lead.title}" wirklich löschen?`}
              redirectTo="/leads"
              label="Löschen"
            />
            <LinkButton href="/leads" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />
      <LeadDetailForm
        lead={{
          id: lead.id,
          title: lead.title,
          status: lead.status,
          notes: lead.notes,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          position: lead.position,
          score: lead.score,
          tags: lead.tags,
          source: lead.source,
          lostReason: lead.lostReason,
          customerId: lead.customerId,
        }}
      />
    </>
  );
}
