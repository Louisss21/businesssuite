import Link from "next/link";
import { PageHeader, Empty } from "@/components/ui";
import { componentService } from "@/modules/inventory/component.service";
import { InventoryManager } from "./InventoryManager";

export const dynamic = "force-dynamic";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: { underMin?: string };
}) {
  const underMin = searchParams.underMin === "true";
  const components = await componentService.list({ underMin });
  const lowCount = (await componentService.list({ underMin: true })).length;

  return (
    <>
      <PageHeader title="Lager" subtitle="Bauteile & Bestände" />

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
      </div>

      <InventoryManager
        components={components.map((c) => ({
          id: c.id,
          sku: c.sku,
          name: c.name,
          unit: c.unit,
          stockQty: c.stockQty,
          minStock: c.minStock,
        }))}
      />
      {components.length === 0 && (
        <Empty>{underMin ? "Kein Bauteil unter Mindestbestand. 🎉" : "Noch keine Bauteile."}</Empty>
      )}
    </>
  );
}
