import { PageHeader, LinkButton } from "@/components/ui";
import { supplierService } from "@/modules/inventory/supplier.service";
import { SupplierManager, type SupplierRow } from "./SupplierManager";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await supplierService.list();
  const rows: SupplierRow[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    count: s._count.components,
  }));

  return (
    <>
      <PageHeader
        title="Lieferanten"
        subtitle="Lieferantenstammdaten für Bauteile & Nachbestellung"
        action={<LinkButton href="/inventory" variant="ghost">← Lager</LinkButton>}
      />
      <SupplierManager suppliers={rows} />
    </>
  );
}
