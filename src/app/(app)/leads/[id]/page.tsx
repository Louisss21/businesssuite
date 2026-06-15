import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import { leadService } from "@/modules/crm/lead.service";
import { LeadDetailForm } from "./LeadDetailForm";
import { DeleteButton } from "@/components/DeleteButton";
import { TaskQuickAdd } from "@/components/TaskQuickAdd";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { activityService } from "@/modules/activities/activity.service";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await leadService.getById(params.id).catch(() => null);
  if (!lead) notFound();

  const activities = await activityService.list({ leadId: lead.id });

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
      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">Aufgaben</h3>
        <TaskQuickAdd presetLeadId={lead.id} />
      </div>
      <div className="mt-6">
        <ActivityTimeline
          leadId={lead.id}
          activities={activities.map((a) => ({
            id: a.id,
            type: a.type,
            subject: a.subject,
            body: a.body,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </>
  );
}
