"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import { DeleteButton } from "@/components/DeleteButton";
import { DuplicateButton } from "@/components/DuplicateButton";

// lokal formatieren (kein Import aus lib/money -> kein @prisma/client im Client-Bundle)
const eur = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
const stockLevel = (stockQty: number, minStock: number): "rot" | "orange" | "gruen" =>
  stockQty <= 0 ? "rot" : stockQty <= minStock ? "orange" : "gruen";

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  priceNet: number;
  stockQty: number;
  minStock: number;
  unit: string;
  active: boolean;
}

const STOCK_BADGE: Record<string, string> = {
  rot: "bg-red-100 text-red-700",
  orange: "bg-amber-100 text-amber-700",
  gruen: "bg-green-100 text-green-700",
};

const columns: Column<ProductRow>[] = [
  {
    key: "sku",
    header: "SKU",
    sort: (p) => p.sku,
    render: (p) => (
      <Link href={`/products/${p.id}`} className="font-medium text-brand-700">
        {p.sku}
      </Link>
    ),
  },
  { key: "name", header: "Name", sort: (p) => p.name.toLowerCase(), render: (p) => p.name },
  {
    key: "category",
    header: "Kategorie",
    sort: (p) => p.category.toLowerCase(),
    render: (p) => <span className="text-slate-500">{p.category || "—"}</span>,
  },
  {
    key: "price",
    header: "Preis (netto)",
    align: "right",
    sort: (p) => p.priceNet,
    render: (p) => eur(p.priceNet),
  },
  {
    key: "stock",
    header: "Bestand",
    align: "right",
    sort: (p) => p.stockQty,
    render: (p) => (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STOCK_BADGE[stockLevel(p.stockQty, p.minStock)]}`}>
        {p.stockQty} {p.unit}
      </span>
    ),
  },
  { key: "active", header: "Aktiv", sort: (p) => (p.active ? 1 : 0), render: (p) => (p.active ? "Ja" : "Nein") },
  {
    key: "actions",
    header: "Aktionen",
    align: "right",
    render: (p) => (
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/products/${p.id}`}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
          title="Bearbeiten"
        >
          ✎
        </Link>
        <DuplicateButton url={`/api/products/${p.id}/duplicate`} redirectBase="/products/" iconOnly />
        <DeleteButton url={`/api/products/${p.id}`} confirmText={`Produkt „${p.name}" wirklich löschen?`} iconOnly />
      </div>
    ),
  },
];

export function ProductsTable({ products }: { products: ProductRow[] }) {
  return (
    <DataTable
      rows={products}
      columns={columns}
      filterText={(p) => `${p.sku} ${p.name} ${p.category}`}
      empty="Noch keine Produkte angelegt."
      getRowId={(p) => p.id}
      bulk={{
        deleteUrl: "/api/products/bulk-delete",
        updateUrl: "/api/products/bulk-update",
        deleteNoun: "Produkt(e)",
        changeFields: [
          {
            key: "active",
            label: "Aktiv-Status",
            type: "select",
            options: [
              { value: "true", label: "Aktiv" },
              { value: "false", label: "Inaktiv" },
            ],
          },
        ],
      }}
    />
  );
}
