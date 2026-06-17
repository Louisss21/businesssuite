import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import { componentService } from "@/modules/inventory/component.service";
import { ComponentForm } from "../ComponentForm";
import { DuplicateButton } from "@/components/DuplicateButton";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ComponentDetailPage({ params }: { params: { id: string } }) {
  const [c, suppliers] = await Promise.all([
    componentService.getById(params.id).catch(() => null),
    componentService.listSuppliers(),
  ]);
  if (!c) notFound();

  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={`SKU ${c.sku}`}
        action={
          <div className="flex flex-wrap gap-2">
            <DuplicateButton url={`/api/components/${c.id}/duplicate`} redirectBase="/inventory/" />
            <DeleteButton
              url={`/api/components/${c.id}`}
              confirmText={`Bauteil „${c.name}" wirklich löschen?`}
              redirectTo="/inventory"
              label="Löschen"
            />
            <LinkButton href="/inventory" variant="ghost">← Lager</LinkButton>
          </div>
        }
      />
      <ComponentForm
        suppliers={suppliers}
        component={{
          id: c.id,
          sku: c.sku,
          name: c.name,
          description: c.description,
          unit: c.unit,
          minStock: c.minStock,
          reorderEmail: c.reorderEmail,
          supplierId: c.supplierId,
          stockQty: c.stockQty,
          active: c.active,
        }}
      />
    </>
  );
}
