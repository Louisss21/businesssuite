import { notFound } from "next/navigation";
import { Card, PageHeader, LinkButton, Badge } from "@/components/ui";
import { quoteService } from "@/modules/quotes/quote.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { settingsService } from "@/modules/settings/settings.service";
import { productService } from "@/modules/products/product.service";
import { DeleteButton } from "@/components/DeleteButton";
import { QuoteForm } from "../QuoteForm";
import { QuoteConvertButton } from "./QuoteConvertButton";
import { SendDocumentButton } from "@/components/SendDocumentButton";

export const dynamic = "force-dynamic";

const isoDate = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const quote = await quoteService.getById(params.id).catch(() => null);
  if (!quote) notFound();

  const [customers, settings, products] = await Promise.all([
    customerService.list(),
    settingsService.get(),
    productService.listActiveSimple(),
  ]);
  const options = customers.map((c) => ({ id: c.id, name: displayName(c) }));

  return (
    <>
      <PageHeader
        title={quote.number}
        subtitle={displayName(quote.customer)}
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href={`/api/quotes/${quote.id}/pdf`}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ⬇ PDF herunterladen
            </a>
            <SendDocumentButton kind="quote" id={quote.id} defaultEmail={quote.customer.email} />
            <DeleteButton
              url={`/api/quotes/${quote.id}`}
              confirmText={`Angebot ${quote.number} wirklich löschen?`}
              redirectTo="/quotes"
              label="Löschen"
            />
            <LinkButton href="/quotes" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />

      <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">Status:</span>
          <Badge value={quote.status} />
        </div>
        <QuoteConvertButton id={quote.id} />
      </Card>

      <QuoteForm
        customers={options}
        products={products}
        defaultTaxRate={Number(settings.defaultTaxRate)}
        quote={{
          id: quote.id,
          customerId: quote.customerId,
          status: quote.status,
          validUntil: isoDate(quote.validUntil),
          notes: quote.notes ?? "",
          items: quote.items.map((it) => ({
            productId: it.productId,
            name: it.name,
            qty: it.qty,
            unitPrice: it.unitPrice,
            discountPct: it.discountPct,
            taxRate: it.taxRate,
          })),
        }}
      />
    </>
  );
}
