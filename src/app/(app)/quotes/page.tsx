import Link from "next/link";
import { PageHeader, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { quoteService } from "@/modules/quotes/quote.service";
import { displayName } from "@/modules/crm/customer.service";
import { BulkTable, type BulkColumn, type BulkRow } from "@/components/bulk/BulkTable";
import type { BulkField } from "@/components/bulk/BulkUI";

export const dynamic = "force-dynamic";

const FILTERS = ["", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

const COLUMNS: BulkColumn[] = [
  { key: "number", header: "Nummer", type: "link", hrefBase: "/quotes/" },
  { key: "customer", header: "Kunde" },
  { key: "validUntil", header: "Gültig bis" },
  { key: "status", header: "Status", type: "badge" },
  { key: "gross", header: "Brutto", align: "right" },
];

const CHANGE_FIELDS: BulkField[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].map((s) => ({
      value: s,
      label: s,
    })),
  },
];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const quotes = await quoteService.list({ status: searchParams.status });

  const rows: BulkRow[] = quotes.map((q) => ({
    id: q.id,
    number: q.number,
    customer: displayName(q.customer),
    validUntil: q.validUntil ? q.validUntil.toLocaleDateString("de-DE") : null,
    status: q.status,
    gross: formatEUR(q.grossTotal),
  }));

  return (
    <>
      <PageHeader
        title="Angebote"
        subtitle="Angebot → Auftrag → Rechnung"
        action={<LinkButton href="/quotes/new">+ Neues Angebot</LinkButton>}
      />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {FILTERS.map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/quotes?status=${s}` : "/quotes"}
            className={`rounded-full px-3 py-1 font-medium ${
              (searchParams.status ?? "") === s
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {s || "Alle"}
          </Link>
        ))}
      </div>

      <BulkTable
        rows={rows}
        columns={COLUMNS}
        editHrefBase="/quotes/"
        deleteUrlBase="/api/quotes/"
        duplicateUrlBase="/api/quotes/"
        duplicateRedirectBase="/quotes/"
        labelKey="number"
        deleteNoun="Angebot(e)"
        rowExtraLinks={[
          { hrefBase: "/api/quotes/", hrefSuffix: "/pdf", icon: "⬇", title: "PDF herunterladen", newTab: true },
        ]}
        bulkDeleteUrl="/api/quotes/bulk-delete"
        bulkUpdateUrl="/api/quotes/bulk-update"
        changeFields={CHANGE_FIELDS}
        emptyText="Noch keine Angebote."
      />
    </>
  );
}
