import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader, Table, Th, Td, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { displayName } from "@/modules/crm/customer.service";
import { settingsService } from "@/modules/settings/settings.service";
import { InvoiceStatusSelect } from "../InvoiceStatusSelect";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const invoice = await invoiceService.getById(params.id).catch(() => null);
  if (!invoice) notFound();
  const company = await settingsService.get();
  const c = invoice.customer;

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Periode ${invoice.accountingPeriod.label}`}
        action={<LinkButton href="/invoices" variant="ghost">← Zurück</LinkButton>}
      />

      <Card className="mb-6 flex items-center justify-between p-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">Status:</span>
          <InvoiceStatusSelect id={invoice.id} status={invoice.status} />
        </div>
        {invoice.order && (
          <Link href={`/orders/${invoice.order.id}`} className="text-sm text-brand-700">
            Bestellung {invoice.order.orderNumber}
          </Link>
        )}
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">Von</h3>
          <p className="text-sm font-medium text-slate-900">{company.companyName || "—"}</p>
          <p className="text-sm text-slate-600">
            {company.street}
            <br />
            {company.postalCode} {company.city}
          </p>
          {company.vatId && <p className="mt-1 text-xs text-slate-500">USt-IdNr.: {company.vatId}</p>}
        </Card>
        <Card className="p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase text-slate-400">An</h3>
          <p className="text-sm font-medium text-slate-900">{displayName(c)}</p>
          <p className="text-sm text-slate-600">
            {c.street}
            <br />
            {c.postalCode} {c.city}
          </p>
          {c.vatId && <p className="mt-1 text-xs text-slate-500">USt-IdNr.: {c.vatId}</p>}
        </Card>
      </div>

      <div className="mb-4 flex gap-8 text-sm text-slate-600">
        <span>Rechnungsdatum: {invoice.issueDate.toLocaleDateString("de-DE")}</span>
        <span>Fällig bis: {invoice.dueDate.toLocaleDateString("de-DE")}</span>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Produkt</Th>
            <Th className="text-right">Menge</Th>
            <Th className="text-right">Einzelpreis</Th>
            <Th className="text-right">MwSt</Th>
            <Th className="text-right">Netto</Th>
            <Th className="text-right">Brutto</Th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((it) => (
            <tr key={it.id}>
              <Td>{it.productName}</Td>
              <Td className="text-right">{String(it.quantity)}</Td>
              <Td className="text-right">{formatEUR(it.unitPrice)}</Td>
              <Td className="text-right">{String(it.taxRate)}%</Td>
              <Td className="text-right">{formatEUR(it.netAmount)}</Td>
              <Td className="text-right">{formatEUR(it.grossAmount)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Netto</span>
            <span>{formatEUR(invoice.netTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">MwSt</span>
            <span>{formatEUR(invoice.taxTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
            <span>Brutto</span>
            <span>{formatEUR(invoice.grossTotal)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
