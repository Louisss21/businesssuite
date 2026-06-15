import { notFound } from "next/navigation";
import { PageHeader, LinkButton, Card } from "@/components/ui";
import { tableModelService } from "@/modules/production/tablemodel.service";
import { componentService } from "@/modules/inventory/component.service";
import { DeleteButton } from "@/components/DeleteButton";
import { ModelEditor } from "./ModelEditor";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({ params }: { params: { id: string } }) {
  const model = await tableModelService.getById(params.id).catch(() => null);
  if (!model) notFound();
  const components = await componentService.list();

  return (
    <>
      <PageHeader
        title={model.name}
        subtitle={model.product ? `Fertigerzeugnis: ${model.product.name}` : "Stückliste"}
        action={
          <div className="flex flex-wrap gap-2">
            <DeleteButton
              url={`/api/table-models/${model.id}`}
              confirmText={`Modell „${model.name}" wirklich löschen?`}
              redirectTo="/production/models"
              label="Löschen"
            />
            <LinkButton href="/production/models" variant="ghost">← Zurück</LinkButton>
          </div>
        }
      />
      {model.description && <Card className="mb-4 p-4 text-sm text-slate-600">{model.description}</Card>}

      <ModelEditor
        modelId={model.id}
        components={components.map((c) => ({ id: c.id, name: c.name, sku: c.sku }))}
        steps={model.steps.map((s) => ({
          id: s.id,
          order: s.order,
          title: s.title,
          instruction: s.instruction,
          videoUrl: s.videoUrl,
          pdfUrl: s.pdfUrl,
          requiresInput: s.requiresInput,
          inputLabel: s.inputLabel,
          bom: s.bomItems.map((b) => ({ id: b.id, componentName: b.component.name, quantity: b.quantity })),
        }))}
      />
    </>
  );
}
