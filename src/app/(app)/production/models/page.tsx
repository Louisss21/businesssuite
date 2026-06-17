import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { tableModelService } from "@/modules/production/tablemodel.service";
import { productService } from "@/modules/products/product.service";
import { ModelCreateForm } from "./ModelCreateForm";
import { DuplicateButton } from "@/components/DuplicateButton";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const [models, products] = await Promise.all([
    tableModelService.list(),
    productService.list({ active: true }),
  ]);

  return (
    <>
      <PageHeader
        title="Tischmodelle"
        subtitle="Stücklisten & Arbeitsschritte"
        action={<LinkButton href="/production" variant="ghost">← Produktion</LinkButton>}
      />
      <ModelCreateForm products={products.map((p) => ({ id: p.id, name: p.name }))} />

      <Table>
        <thead>
          <tr>
            <Th>Modell</Th>
            <Th>Aktiv</Th>
            <Th className="text-right">Schritte</Th>
            <Th className="text-right">Aufträge</Th>
            <Th className="text-right"></Th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id}>
              <Td>
                <Link href={`/production/models/${m.id}`} className="font-medium text-brand-700">
                  {m.name}
                </Link>
              </Td>
              <Td><Badge value={m.active ? "Aktiv" : "Inaktiv"} /></Td>
              <Td className="text-right">{m._count.steps}</Td>
              <Td className="text-right">{m._count.orders}</Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <DuplicateButton
                    url={`/api/table-models/${m.id}/duplicate`}
                    redirectBase="/production/models/"
                    iconOnly
                  />
                  <DeleteButton
                    url={`/api/table-models/${m.id}`}
                    confirmText={`Modell „${m.name}" wirklich löschen? (Modelle mit Produktionsaufträgen sind geschützt – dann stattdessen auf inaktiv setzen.)`}
                    iconOnly
                  />
                  <Link href={`/production/models/${m.id}`} className="text-sm font-medium text-brand-700">
                    Bearbeiten →
                  </Link>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {models.length === 0 && <Empty>Noch keine Modelle.</Empty>}
    </>
  );
}
