import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import { productionService } from "@/modules/production/production.service";
import { ProductionAssistant } from "./ProductionAssistant";

export const dynamic = "force-dynamic";

export default async function ProductionOrderPage({ params }: { params: { id: string } }) {
  const order = await productionService.getById(params.id).catch(() => null);
  if (!order) notFound();

  const serialSuggestion = order.serialNumber ? "" : await productionService.suggestSerial();

  const steps = order.tableModel.steps.map((s) => ({
    order: s.order,
    title: s.title,
    instruction: s.instruction,
    videoUrl: s.videoUrl,
    pdfUrl: s.pdfUrl,
    requiresInput: s.requiresInput,
    inputLabel: s.inputLabel,
    bom: s.bomItems.map((b) => ({
      name: b.component.name,
      unit: b.component.unit,
      quantity: b.quantity,
      stock: b.component.stockQty,
    })),
  }));

  return (
    <>
      <PageHeader
        title={`Montage: ${order.tableModel.name}`}
        subtitle={order.serialNumber ? `Seriennummer ${order.serialNumber}` : "Sustable-Montage"}
        action={<LinkButton href="/production" variant="ghost">← Zurück</LinkButton>}
      />
      <ProductionAssistant
        order={{
          id: order.id,
          status: order.status,
          currentStep: order.currentStep,
          serialNumber: order.serialNumber,
        }}
        steps={steps}
        modelName={order.tableModel.name}
        productName={order.tableModel.product?.name ?? null}
        serialSuggestion={serialSuggestion}
      />
    </>
  );
}
