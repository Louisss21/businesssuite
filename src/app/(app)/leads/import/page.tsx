import { PageHeader, LinkButton } from "@/components/ui";
import { LeadImportWizard } from "./LeadImportWizard";

export const dynamic = "force-dynamic";

export default function LeadImportPage() {
  return (
    <>
      <PageHeader
        title="Leads importieren"
        subtitle="CSV- oder Excel-Datei in 4 Schritten importieren"
        action={<LinkButton href="/leads" variant="ghost">← Zurück</LinkButton>}
      />
      <LeadImportWizard />
    </>
  );
}
