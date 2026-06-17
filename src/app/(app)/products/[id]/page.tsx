import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import { productService } from "@/modules/products/product.service";
import { ProductForm } from "../ProductForm";
import { DuplicateButton } from "@/components/DuplicateButton";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await productService.getById(params.id).catch(() => null);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={`SKU ${product.sku}`}
        action={
          <div className="flex flex-wrap gap-2">
            <DuplicateButton url={`/api/products/${product.id}/duplicate`} redirectBase="/products/" />
            <LinkButton href="/products" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />
      <ProductForm
        product={{
          id: product.id,
          sku: product.sku,
          name: product.name,
          description: product.description,
          categoryName: product.category?.name ?? null,
          priceNet: product.priceNet,
          taxRate: product.taxRate,
          stockQty: product.stockQty,
          minStock: product.minStock,
          unit: product.unit,
          active: product.active,
        }}
      />
    </>
  );
}
