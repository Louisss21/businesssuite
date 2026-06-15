import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { productionService } from "@/modules/production/production.service";
import { StartProduction } from "./StartProduction";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const [orders, models] = await Promise.all([
    productionService.listOrders(),
    productionService.listActiveModels(),
  ]);

  return (
    <>
      <PageHeader
        title="Produktion"
        subtitle="Sustable-Montage"
        action={<LinkButton href="/production/models" variant="ghost">Modelle verwalten</LinkButton>}
      />
      <StartProduction models={models.map((m) => ({ id: m.id, name: m.name, steps: m._count.steps }))} />

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Produktionsaufträge</h2>
      <Table>
        <thead>
          <tr>
            <Th>Modell</Th>
            <Th>Seriennummer</Th>
            <Th>Fortschritt</Th>
            <Th>Status</Th>
            <Th>Gestartet</Th>
            <Th className="text-right"></Th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <Td className="font-medium text-slate-900">{o.tableModel.name}</Td>
              <Td className="font-mono text-xs">{o.serialNumber ?? "—"}</Td>
              <Td>{o.status === "COMPLETED" ? "Fertig" : `Schritt ${o.currentStep}`}</Td>
              <Td><Badge value={o.status} /></Td>
              <Td className="text-slate-500">{o.startedAt.toLocaleDateString("de-DE")}</Td>
              <Td className="text-right">
                <Link href={`/production/${o.id}`} className="text-sm font-medium text-brand-700">
                  Öffnen →
                </Link>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {orders.length === 0 && <Empty>Noch keine Produktionsaufträge.</Empty>}
    </>
  );
}
