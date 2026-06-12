import { PageHeader } from "@/components/ui";
import { settingsService } from "@/modules/settings/settings.service";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await settingsService.get();
  const initial = {
    companyName: s.companyName,
    email: s.email,
    street: s.street,
    phone: s.phone,
    postalCode: s.postalCode,
    city: s.city,
    taxNumber: s.taxNumber,
    vatId: s.vatId,
    invoiceNumberFormat: s.invoiceNumberFormat,
    orderNumberFormat: s.orderNumberFormat,
    defaultPaymentTermDays: s.defaultPaymentTermDays,
    defaultTaxRate: Number(s.defaultTaxRate),
  };

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Stammdaten & Systemkonfiguration" />
      <SettingsForm initial={initial} />
    </>
  );
}
