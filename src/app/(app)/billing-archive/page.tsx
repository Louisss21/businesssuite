import Link from "next/link";
import { Card, PageHeader, Empty } from "@/components/ui";
import { archiveService } from "@/modules/billing-archive/archive.service";
import { formatEUR } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function BillingArchivePage() {
  const years = await archiveService.years();
  const trees = await Promise.all(years.map((y) => archiveService.yearTree(y)));

  return (
    <>
      <PageHeader
        title="Rechnungsarchiv"
        subtitle="Logische Buchhaltungs-Ordner: Jahr → Quartal → Monat"
      />

      {years.length === 0 && (
        <Empty>Noch keine Rechnungen archiviert.</Empty>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trees.map((tree) => (
          <Link key={tree.year} href={`/billing-archive/${tree.year}`}>
            <Card className="p-5 transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-slate-900">{tree.year}</span>
                <span className="text-xs text-slate-400">📁</span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <Row label="Rechnungen" value={String(tree.sums.count)} />
                <Row label="Netto" value={formatEUR(tree.sums.net)} />
                <Row label="MwSt" value={formatEUR(tree.sums.tax)} />
                <Row label="Brutto" value={formatEUR(tree.sums.gross)} strong />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? "font-semibold text-slate-900" : "text-slate-700"}>
        {value}
      </span>
    </div>
  );
}
