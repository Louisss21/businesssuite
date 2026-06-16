import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { quoteService } from "@/modules/quotes/quote.service";
import { displayName } from "@/modules/crm/customer.service";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

const FILTERS = ["", "DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"];

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const quotes = await quoteService.list({ status: searchParams.status });

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

      <Table>
        <thead>
          <tr>
            <Th>Nummer</Th>
            <Th>Kunde</Th>
            <Th>Gültig bis</Th>
            <Th>Status</Th>
            <Th className="text-right">Brutto</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id}>
              <Td>
                <Link href={`/quotes/${q.id}`} className="font-medium text-brand-700">
                  {q.number}
                </Link>
              </Td>
              <Td>{displayName(q.customer)}</Td>
              <Td>{q.validUntil ? q.validUntil.toLocaleDateString("de-DE") : "—"}</Td>
              <Td>
                <Badge value={q.status} />
              </Td>
              <Td className="text-right">{formatEUR(q.grossTotal)}</Td>
              <Td className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <a
                    href={`/api/quotes/${q.id}/pdf`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="PDF herunterladen"
                  >
                    ⬇
                  </a>
                  <Link
                    href={`/quotes/${q.id}`}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    title="Bearbeiten"
                  >
                    ✎
                  </Link>
                  <DeleteButton
                    url={`/api/quotes/${q.id}`}
                    confirmText={`Angebot ${q.number} wirklich löschen?`}
                    iconOnly
                  />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {quotes.length === 0 && <Empty>Noch keine Angebote.</Empty>}
    </>
  );
}
