import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { productionService } from "@/modules/production/production.service";
import { StartProduction } from "./StartProduction";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const STATUS_LABEL: Record<string, string> = {
  "": "Alle",
  IN_PROGRESS: "In Arbeit",
  COMPLETED: "Fertig",
  CANCELLED: "Abgebrochen",
};

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = searchParams.status ?? "";
  const q = searchParams.q ?? "";
  const [orders, models] = await Promise.all([
    productionService.listOrders({ status: status || undefined, search: q || undefined }),
    productionService.listActiveModels(),
  ]);

  const qs = (s: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const str = p.toString();
    return str ? `/production?${str}` : "/production";
  };

  return (
    <>
      <PageHeader
        title="Produktion"
        subtitle="Sustable-Montage"
        action={<LinkButton href="/production/models" variant="ghost">Modelle verwalten</LinkButton>}
      />
      <StartProduction models={models.map((m) => ({ id: m.id, name: m.name, steps: m._count.steps }))} />

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Produktionsaufträge</h2>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s || "all"}
            href={qs(s)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              status === s ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
        <form action="/production" className="ml-auto flex items-center gap-2">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Seriennummer suchen…"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Suchen
          </button>
        </form>
      </div>
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
                <div className="flex items-center justify-end gap-2">
                  <DeleteButton
                    url={`/api/production/${o.id}`}
                    confirmText="Produktionsauftrag wirklich löschen? (Abgeschlossene/teil-entnommene Aufträge sind geschützt.)"
                    iconOnly
                  />
                  <Link href={`/production/${o.id}`} className="text-sm font-medium text-brand-700">
                    Öffnen →
                  </Link>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {orders.length === 0 && <Empty>Noch keine Produktionsaufträge.</Empty>}
    </>
  );
}
