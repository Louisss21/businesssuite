import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { displayName } from "@/modules/crm/customer.service";
import { InvoicesTable, type InvoiceRow } from "./InvoicesTable";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  // Überfällige Rechnungen automatisch markieren (kein Cron -> lazy beim Aufruf)
  await invoiceService.markOverdue();
  const invoices = await invoiceService.list({ status: searchParams.status });

  const rows: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    customer: displayName(inv.customer),
    issueDate: inv.issueDate.toLocaleDateString("de-DE"),
    dueDate: inv.dueDate.toLocaleDateString("de-DE"),
    period: inv.accountingPeriod.label,
    gross: formatEUR(inv.grossTotal),
    status: inv.status,
  }));

  return (
    <>
      <PageHeader title="Rechnungen" subtitle="Alle Rechnungen" />

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {["", "OPEN", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
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

      <InvoicesTable rows={rows} />
    </>
  );
}
