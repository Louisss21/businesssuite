import { PageHeader, LinkButton } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { orderService } from "@/modules/orders/order.service";
import { displayName } from "@/modules/crm/customer.service";
import { BulkTable, type BulkColumn, type BulkRow } from "@/components/bulk/BulkTable";
import type { BulkField } from "@/components/bulk/BulkUI";

export const dynamic = "force-dynamic";

const COLUMNS: BulkColumn[] = [
  { key: "orderNumber", header: "Nummer", type: "link", hrefBase: "/orders/" },
  { key: "customer", header: "Kunde" },
  { key: "source", header: "Quelle" },
  { key: "status", header: "Status", type: "badge" },
  { key: "hinweis", header: "Hinweis" },
  { key: "invoice", header: "Rechnung" },
  { key: "gross", header: "Brutto", align: "right" },
];

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Manuell",
  PHONE: "Telefon",
  ONLINESHOP: "Online-Shop",
};

const CHANGE_FIELDS: BulkField[] = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((s) => ({
      value: s,
      label: s,
    })),
  },
];

export default async function OrdersPage() {
  const orders = await orderService.list();

  const rows: BulkRow[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customer: displayName(o.customer),
    source: SOURCE_LABEL[o.source] ?? o.source,
    status: o.status,
    hinweis: o.hasUnmatchedSku ? "⚠ SKU offen" : null,
    invoice: o.invoice ? o.invoice.invoiceNumber : null,
    gross: formatEUR(o.grossTotal),
  }));

  return (
    <>
      <PageHeader
        title="Bestellungen"
        subtitle="Manuell erfasste Bestellungen"
        action={<LinkButton href="/orders/new">+ Neue Bestellung</LinkButton>}
      />
      <BulkTable
        rows={rows}
        columns={COLUMNS}
        editHrefBase="/orders/"
        deleteUrlBase="/api/orders/"
        duplicateUrlBase="/api/orders/"
        duplicateRedirectBase="/orders/"
        labelKey="orderNumber"
        deleteNoun="Bestellung(en)"
        rowExtraLinks={[
          { hrefBase: "/api/orders/", hrefSuffix: "/pdf?type=confirmation", icon: "AB", title: "Auftragsbestätigung", newTab: true },
          { hrefBase: "/api/orders/", hrefSuffix: "/pdf?type=deliverynote", icon: "LS", title: "Lieferschein", newTab: true },
        ]}
        bulkDeleteUrl="/api/orders/bulk-delete"
        bulkUpdateUrl="/api/orders/bulk-update"
        changeFields={CHANGE_FIELDS}
        emptyText="Noch keine Bestellungen."
      />
    </>
  );
}
