import { PageHeader } from "@/components/ui";
import { settingsService } from "@/modules/settings/settings.service";
import { SettingsForm } from "./SettingsForm";
import { SettingsTabs } from "./SettingsTabs";
import { LogoUpload } from "./LogoUpload";
import { TestReorderButton } from "./TestReorderButton";
import { RoleFootersForm } from "./RoleFootersForm";

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
    bankName: s.bankName,
    iban: s.iban,
    bic: s.bic,
    purchasingEmail: s.purchasingEmail,
    invoiceNumberFormat: s.invoiceNumberFormat,
    orderNumberFormat: s.orderNumberFormat,
    quoteNumberFormat: s.quoteNumberFormat,
    defaultPaymentTermDays: s.defaultPaymentTermDays,
    defaultTaxRate: Number(s.defaultTaxRate),
    invoiceFooter: s.invoiceFooter,
  };

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Stammdaten & Systemkonfiguration" />
      <SettingsTabs active="general" />
      <LogoUpload initialUrl={s.logoUrl} />
      <RoleFootersForm
        initial={(s.roleFooters as unknown as Record<string, string> | null) ?? {}}
        globalFooter={s.invoiceFooter}
      />
      <TestReorderButton />
      <SettingsForm initial={initial} />
    </>
  );
}
