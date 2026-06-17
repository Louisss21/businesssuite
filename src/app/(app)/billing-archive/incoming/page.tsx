import Link from "next/link";
import { PageHeader, Table, Th, Td, Empty, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { MONTH_NAMES_DE } from "@/modules/billing-archive/period";
import { incomingInvoiceService } from "@/modules/billing-archive/incoming-invoice.service";
import { DeleteButton } from "@/components/DeleteButton";
import { IncomingInvoiceUpload } from "./IncomingInvoiceUpload";
import { IncomingStatusToggle } from "./IncomingStatusToggle";
import { ScanInboxButton } from "./ScanInboxButton";

export const dynamic = "force-dynamic";

type SP = { year?: string; quarter?: string; month?: string; status?: string };

function buildHref(base: SP, patch: Partial<SP>) {
  const merged: SP = { ...base, ...patch };
  const sp = new URLSearchParams();
  if (merged.year) sp.set("year", merged.year);
  if (merged.quarter) sp.set("quarter", merged.quarter);
  if (merged.month) sp.set("month", merged.month);
  if (merged.status) sp.set("status", merged.status);
  const q = sp.toString();
  return q ? `/billing-archive/incoming?${q}` : "/billing-archive/incoming";
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        active ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {children}
    </Link>
  );
}

const money = (v: number | null) => (v == null ? "—" : formatEUR(v));

export default async function IncomingInvoicesPage({ searchParams }: { searchParams: SP }) {
  const year = searchParams.year ? Number(searchParams.year) : undefined;
  const quarter = searchParams.quarter ? Number(searchParams.quarter) : undefined;
  const month = searchParams.month ? Number(searchParams.month) : undefined;
  const status = searchParams.status || undefined;

  const [years, rows] = await Promise.all([
    incomingInvoiceService.years(),
    incomingInvoiceService.list({ year, quarter, month, status }),
  ]);

  return (
    <>
      <PageHeader
        title="Eingangsrechnungen"
        subtitle="Lieferantenrechnungen · Jahr → Quartal → Monat"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/incoming-invoices/export-zip${
                buildHref(searchParams, {}).split("?")[1]
                  ? "?" + buildHref(searchParams, {}).split("?")[1]
                  : ""
              }`}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ⬇ Als ZIP exportieren
            </a>
            <ScanInboxButton />
            <LinkButton href="/billing-archive" variant="ghost">← Rechnungsarchiv</LinkButton>
          </div>
        }
      />

      <IncomingInvoiceUpload />

      {/* Filter: Jahr */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Jahr</span>
        <Chip href={buildHref(searchParams, { year: undefined, quarter: undefined, month: undefined })} active={!year}>
          Alle
        </Chip>
        {years.map((y) => (
          <Chip key={y} href={buildHref(searchParams, { year: String(y), quarter: undefined, month: undefined })} active={year === y}>
            {y}
          </Chip>
        ))}
      </div>

      {/* Filter: Quartal + Monat (nur sinnvoll mit Jahr) */}
      {year && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Quartal</span>
            <Chip href={buildHref(searchParams, { quarter: undefined, month: undefined })} active={!quarter && !month}>
              Alle
            </Chip>
            {[1, 2, 3, 4].map((q) => (
              <Chip key={q} href={buildHref(searchParams, { quarter: String(q), month: undefined })} active={quarter === q && !month}>
                Q{q}
              </Chip>
            ))}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Monat</span>
            {MONTH_NAMES_DE.map((name, i) => (
              <Chip key={name} href={buildHref(searchParams, { month: String(i + 1), quarter: undefined })} active={month === i + 1}>
                {name.slice(0, 3)}
              </Chip>
            ))}
          </div>
        </>
      )}

      {/* Filter: Status */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</span>
        <Chip href={buildHref(searchParams, { status: undefined })} active={!status}>Alle</Chip>
        <Chip href={buildHref(searchParams, { status: "OPEN" })} active={status === "OPEN"}>Offen</Chip>
        <Chip href={buildHref(searchParams, { status: "PAID" })} active={status === "PAID"}>Bezahlt</Chip>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Datum</Th>
            <Th>Lieferant</Th>
            <Th>Nr.</Th>
            <Th className="text-right">Netto</Th>
            <Th className="text-right">MwSt</Th>
            <Th className="text-right">Brutto</Th>
            <Th>Status</Th>
            <Th>Quelle</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.invoiceDate.toLocaleDateString("de-DE")}</Td>
              <Td className="font-medium text-slate-900">{r.supplierName}</Td>
              <Td className="text-slate-600">{r.invoiceNo ?? "—"}</Td>
              <Td className="text-right">{money(r.amountNet)}</Td>
              <Td className="text-right">{money(r.taxAmount)}</Td>
              <Td className="text-right">{money(r.amountGross)}</Td>
              <Td>
                <IncomingStatusToggle id={r.id} status={r.status} />
              </Td>
              <Td className="text-xs uppercase text-slate-400">{r.source}</Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Datei öffnen / herunterladen"
                  >
                    ⬇
                  </a>
                  <DeleteButton
                    url={`/api/incoming-invoices/${r.id}`}
                    confirmText={`Eingangsrechnung von ${r.supplierName} wirklich löschen?`}
                    iconOnly
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <Empty>Keine Eingangsrechnungen für diese Auswahl.</Empty>}
    </>
  );
}
