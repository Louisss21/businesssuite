import Link from "next/link";
import { PageHeader, Table, Th, Td, Empty } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { productService } from "@/modules/products/product.service";
import { stockLevel } from "@/modules/products/product.schema";
import { DeleteButton } from "@/components/DeleteButton";
import { ProductForm } from "./ProductForm";

export const dynamic = "force-dynamic";

const STOCK_BADGE: Record<string, string> = {
  rot: "bg-red-100 text-red-700",
  orange: "bg-amber-100 text-amber-700",
  gruen: "bg-green-100 text-green-700",
};

export default async function ProductsPage() {
  const products = await productService.list();

  return (
    <>
      <PageHeader title="Produkte" subtitle="Produktstammdaten & Lager" />
      <ProductForm />
      <Table>
        <thead>
          <tr>
            <Th>SKU</Th>
            <Th>Name</Th>
            <Th>Kategorie</Th>
            <Th className="text-right">Preis (netto)</Th>
            <Th className="text-right">Bestand</Th>
            <Th>Aktiv</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const level = stockLevel(p.stockQty, p.minStock);
            return (
              <tr key={p.id}>
                <Td>
                  <Link href={`/products/${p.id}`} className="font-medium text-brand-700">
                    {p.sku}
                  </Link>
                </Td>
                <Td>{p.name}</Td>
                <Td className="text-slate-500">{p.category?.name ?? "—"}</Td>
                <Td className="text-right">{formatEUR(p.priceNet)}</Td>
                <Td className="text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STOCK_BADGE[level]}`}>
                    {p.stockQty} {p.unit}
                  </span>
                </Td>
                <Td>{p.active ? "Ja" : "Nein"}</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/products/${p.id}`}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                      title="Bearbeiten"
                    >
                      ✎
                    </Link>
                    <DeleteButton
                      url={`/api/products/${p.id}`}
                      confirmText={`Produkt „${p.name}" wirklich löschen?`}
                      iconOnly
                    />
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {products.length === 0 && <Empty>Noch keine Produkte angelegt.</Empty>}
    </>
  );
}
