import Link from "next/link";
import { PageHeader, Empty, LinkButton } from "@/components/ui";
import { componentService } from "@/modules/inventory/component.service";
import { InventoryManager } from "./InventoryManager";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { underMin?: string; inactive?: string };
}) {
  const underMin = searchParams.underMin === "true";
  const includeInactive = searchParams.inactive === "true";
  const components = await componentService.list({ underMin, includeInactive });
  const lowCount = (await componentService.list({ underMin: true })).length;

  return (
    <>
      <PageHeader
        title="Lager"
        subtitle="Bauteile & Bestände"
        action={
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/inventory/suppliers" variant="ghost">Lieferanten</LinkButton>
            <LinkButton href="/inventory/new">+ Neues Bauteil</LinkButton>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/inventory"
          className={`rounded-full px-3 py-1 font-medium ${!underMin ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Alle Bauteile
        </Link>
        <Link
          href="/inventory?underMin=true"
          className={`rounded-full px-3 py-1 font-medium ${underMin ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Unter Mindestbestand ({lowCount})
        </Link>
        <Link
          href={includeInactive ? "/inventory" : "/inventory?inactive=true"}
          className={`rounded-full px-3 py-1 font-medium ${includeInactive ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
        >
          Stillgelegte einblenden
        </Link>
      </div>

      <InventoryManager
        components={components.map((c) => ({
          id: c.id,
          sku: c.sku,
          name: c.name,
          unit: c.unit,
          stockQty: c.stockQty,
          minStock: c.minStock,
          active: c.active,
        }))}
      />
      {components.length === 0 && (
        <Empty>{underMin ? "Kein Bauteil unter Mindestbestand. 🎉" : "Noch keine Bauteile."}</Empty>
      )}
    </>
  );
}
