import { PageHeader, LinkButton } from "@/components/ui";
import { componentService } from "@/modules/inventory/component.service";
import { ComponentForm } from "../ComponentForm";

export const dynamic = "force-dynamic";

export default async function NewComponentPage() {
  const suppliers = await componentService.listSuppliers();
  return (
    <>
      <PageHeader
        title="Neues Bauteil"
        subtitle="Bauteil-Stammdaten anlegen (Bestand danach via Wareneingang buchen)"
        action={<LinkButton href="/inventory" variant="ghost">← Lager</LinkButton>}
      />
      <ComponentForm suppliers={suppliers} />
    </>
  );
}
