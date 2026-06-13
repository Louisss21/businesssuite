import Link from "next/link";
import { PageHeader, Table, Th, Td, Badge, Empty } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { displayName } from "@/modules/crm/customer.service";
import { InvoiceStatusSelect } from "./InvoiceStatusSelect";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const invoices = await invoiceService.list({ status: searchParams.status });

  return (
    <>
      <PageHeader title="Rechnungen" subtitle="Alle Rechnungen" />

      <div className="mb-4 flex gap-2 text-sm">
        {["", "OPEN", "PAID", "OVERDUE"].map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/invoices?status=${s}` : "/invoices"}
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
            <Th>Datum</Th>
            <Th>Fällig</Th>
            <Th>Periode</Th>
            <Th className="text-right">Brutto</Th>
            <Th>Status</Th>
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
              <Td>{inv.dueDate.toLocaleDateString("de-DE")}</Td>
              <Td className="text-slate-500">{inv.accountingPeriod.label}</Td>
              <Td className="text-right">{formatEUR(inv.grossTotal)}</Td>
              <Td>
                <InvoiceStatusSelect id={inv.id} status={inv.status} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {invoices.length === 0 && (
        <Empty>Keine Rechnungen. Erstelle eine aus einer Bestellung.</Empty>
      )}
    </>
  );
}
