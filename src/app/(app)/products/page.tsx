import { PageHeader } from "@/components/ui";
import { productService } from "@/modules/products/product.service";
import { ProductForm } from "./ProductForm";
import { ProductsTable } from "./ProductsTable";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await productService.list();

  return (
    <>
      <PageHeader title="Produkte" subtitle="Produktstammdaten & Lager" />
      <ProductForm />
      <ProductsTable
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          category: p.category?.name ?? "",
          priceNet: p.priceNet,
          stockQty: p.stockQty,
          minStock: p.minStock,
          unit: p.unit,
          active: p.active,
        }))}
      />
    </>
  );
}
