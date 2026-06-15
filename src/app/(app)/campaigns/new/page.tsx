import { PageHeader, LinkButton } from "@/components/ui";
import { CampaignForm } from "../CampaignForm";

export const dynamic = "force-dynamic";

export default function NewCampaignPage() {
  return (
    <>
      <PageHeader
        title="Neue Kampagne"
        action={<LinkButton href="/campaigns" variant="ghost">← Zurück</LinkButton>}
      />
      <CampaignForm />
    </>
  );
}
