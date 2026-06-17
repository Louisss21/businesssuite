import { notFound } from "next/navigation";
import { PageHeader, LinkButton } from "@/components/ui";
import { productionService } from "@/modules/production/production.service";
import { isRealMedia } from "@/lib/media";
import { ProductionAssistant } from "./ProductionAssistant";
import { SerialEditor } from "./SerialEditor";
import { DeleteButton } from "@/components/DeleteButton";

export const dynamic = "force-dynamic";

export default async function ProductionOrderPage({ params }: { params: { id: string } }) {
  const order = await productionService.getById(params.id).catch(() => null);
  if (!order) notFound();

  const serialSuggestion = order.serialNumber ? "" : await productionService.suggestSerial();

  const steps = order.tableModel.steps.map((s) => ({
    order: s.order,
    title: s.title,
    instruction: s.instruction,
    videoUrl: isRealMedia(s.videoUrl) ? s.videoUrl : null,
    pdfUrl: isRealMedia(s.pdfUrl) ? s.pdfUrl : null,
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
        action={
          <div className="flex flex-wrap gap-2">
            <DeleteButton
              url={`/api/production/${order.id}`}
              confirmText="Produktionsauftrag wirklich löschen? (Abgeschlossene/teil-entnommene Aufträge sind geschützt.)"
              redirectTo="/production"
              label="Löschen"
            />
            <LinkButton href="/production" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />
      <SerialEditor orderId={order.id} current={order.serialNumber} />
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
