import { PageHeader, LinkButton } from "@/components/ui";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { settingsService } from "@/modules/settings/settings.service";
import { OrderForm } from "../OrderForm";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [customers, settings] = await Promise.all([
    customerService.list(),
    settingsService.get(),
  ]);
  const options = customers.map((c) => ({ id: c.id, name: displayName(c) }));

  return (
    <>
      <PageHeader
        title="Neue Bestellung"
        action={<LinkButton href="/orders" variant="ghost">← Zurück</LinkButton>}
      />
      <OrderForm customers={options} defaultTaxRate={Number(settings.defaultTaxRate)} />
    </>
  );
}
