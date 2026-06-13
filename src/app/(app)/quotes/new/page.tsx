import { PageHeader, LinkButton } from "@/components/ui";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { settingsService } from "@/modules/settings/settings.service";
import { productService } from "@/modules/products/product.service";
import { QuoteForm } from "../QuoteForm";

export const dynamic = "force-dynamic";

export default async function NewQuotePage() {
  const [customers, settings, products] = await Promise.all([
    customerService.list(),
    settingsService.get(),
    productService.listActiveSimple(),
  ]);
  const options = customers.map((c) => ({ id: c.id, name: displayName(c) }));

  return (
    <>
      <PageHeader
        title="Neues Angebot"
        action={<LinkButton href="/quotes" variant="ghost">← Zurück</LinkButton>}
      />
      <QuoteForm
        customers={options}
        products={products}
        defaultTaxRate={Number(settings.defaultTaxRate)}
      />
    </>
  );
}
