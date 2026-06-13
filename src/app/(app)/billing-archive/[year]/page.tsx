import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import {
  archiveService,
  scopeLabel,
} from "@/modules/billing-archive/archive.service";
import { displayName } from "@/modules/crm/customer.service";

export const dynamic = "force-dynamic";

/** Export-Link-Builder. */
function exportHref(year: number, params: { quarter?: number; month?: number }) {
  const sp = new URLSearchParams({ year: String(year) });
  if (params.quarter) sp.set("quarter", String(params.quarter));
  if (params.month) sp.set("month", String(params.month));
  return `/api/billing-archive/export?${sp.toString()}`;
}

function ExportButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      ⬇ {label}
    </a>
  );
}

export default async function YearArchivePage({
  params,
  searchParams,
}: {
  params: { year: string };
  searchParams: { quarter?: string; month?: string; status?: string };
}) {
  const year = Number(params.year);
  if (!Number.isInteger(year)) notFound();

  const tree = await archiveService.yearTree(year);

  const filter = {
    year,
    quarter: searchParams.quarter ? Number(searchParams.quarter) : undefined,
    month: searchParams.month ? Number(searchParams.month) : undefined,
    status: searchParams.status,
  };
  const invoices = await archiveService.invoicesInPeriod(filter);

  return (
    <>
      <PageHeader
        title={`Archiv ${year}`}
        subtitle="Quartals- und Monatsstruktur"
        action={
          <div className="flex gap-2">
            <ExportButton href={exportHref(year, {})} label="Jahr exportieren" />
            <LinkButton href="/billing-archive" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />

      {/* Quartals-/Monats-Baum */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {tree.quarters.map((q) => (
          <Card key={q.quarter} className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                Q{q.quarter} {year}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  {q.sums.count} Rechnungen · {formatEUR(q.sums.gross)}
                </span>
              </h3>
              <ExportButton
                href={exportHref(year, { quarter: q.quarter })}
                label={`Q${q.quarter}`}
              />
            </div>
            <ul className="space-y-1 text-sm">
              {q.months.map((m) => (
                <li
                  key={m.month}
                  className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-slate-50"
                >
                  <Link
                    href={`/billing-archive/${year}?month=${m.month}`}
                    className="text-slate-700 hover:text-brand-700"
                  >
                    {String(m.month).padStart(2, "0")}_{m.name}
                    <span className="ml-2 text-xs text-slate-400">
                      ({m.sums.count})
                    </span>
                  </Link>
                  <span className="flex items-center gap-3">
                    <span className="text-slate-600">{formatEUR(m.sums.gross)}</span>
                    <ExportButton
                      href={exportHref(year, { month: m.month })}
                      label="CSV"
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Gefilterte Rechnungsliste */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Rechnungen · {scopeLabel(filter)}
        </h2>
        {(filter.month || filter.quarter) && (
          <Link href={`/billing-archive/${year}`} className="text-sm text-brand-700">
            Filter zurücksetzen
          </Link>
        )}
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Nummer</Th>
            <Th>Kunde</Th>
            <Th>Datum</Th>
            <Th>Periode</Th>
            <Th>Status</Th>
            <Th className="text-right">Netto</Th>
            <Th className="text-right">MwSt</Th>
            <Th className="text-right">Brutto</Th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <Td>
                <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700">
                  {inv.invoiceNumber}
                </Link>
              </Td>
              <Td>{displayName(inv.customer)}</Td>
              <Td>{inv.issueDate.toLocaleDateString("de-DE")}</Td>
              <Td className="text-slate-500">{inv.accountingPeriod.label}</Td>
              <Td>
                <Badge value={inv.status} />
              </Td>
              <Td className="text-right">{formatEUR(inv.netTotal)}</Td>
              <Td className="text-right">{formatEUR(inv.taxTotal)}</Td>
              <Td className="text-right">{formatEUR(inv.grossTotal)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {invoices.length === 0 && <Empty>Keine Rechnungen in diesem Zeitraum.</Empty>}
    </>
  );
}
