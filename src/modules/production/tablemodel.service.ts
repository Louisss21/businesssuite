import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http";

export const modelCreateSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich"),
  description: z.string().trim().optional().or(z.literal("")),
  productId: z.string().optional().or(z.literal("")),
  active: z.coerce.boolean().optional(),
});

export const stepCreateSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich"),
  instruction: z.string().trim().min(1, "Anleitung erforderlich"),
  order: z.coerce.number().int().min(1).optional(),
  videoUrl: z.string().trim().optional().or(z.literal("")),
  pdfUrl: z.string().trim().optional().or(z.literal("")),
  requiresInput: z.coerce.boolean().optional(),
  inputLabel: z.string().trim().optional().or(z.literal("")),
});

export const bomCreateSchema = z.object({
  componentId: z.string().min(1, "Bauteil erforderlich"),
  quantity: z.coerce.number().int().min(1, "Menge > 0"),
});

const orNull = (v?: string | null) => (v ? v : null);

export const tableModelService = {
  list() {
    return prisma.tableModel.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { steps: true, orders: true } } },
    });
  },

  async getById(id: string) {
    const m = await prisma.tableModel.findUnique({
      where: { id },
      include: {
        product: true,
        steps: {
          orderBy: { order: "asc" },
          include: { bomItems: { include: { component: true } } },
        },
      },
    });
    if (!m) throw notFound("Modell nicht gefunden");
    return m;
  },

  create(input: unknown) {
    const d = modelCreateSchema.parse(input);
    return prisma.tableModel.create({
      data: {
        name: d.name,
        description: orNull(d.description),
        productId: orNull(d.productId),
        active: d.active ?? true,
      },
    });
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const d = modelCreateSchema.partial().parse(input);
    return prisma.tableModel.update({
      where: { id },
      data: {
        name: d.name,
        description: d.description === undefined ? undefined : orNull(d.description),
        productId: d.productId === undefined ? undefined : orNull(d.productId),
        active: d.active,
      },
    });
  },

  delete(id: string) {
    return prisma.tableModel.delete({ where: { id } });
  },

  async addStep(modelId: string, input: unknown) {
    await this.getById(modelId);
    const d = stepCreateSchema.parse(input);
    const count = await prisma.productionStep.count({ where: { tableModelId: modelId } });
    return prisma.productionStep.create({
      data: {
        tableModelId: modelId,
        order: d.order ?? count + 1,
        title: d.title,
        instruction: d.instruction,
        videoUrl: orNull(d.videoUrl),
        pdfUrl: orNull(d.pdfUrl),
        requiresInput: d.requiresInput ?? false,
        inputLabel: orNull(d.inputLabel),
      },
    });
  },

  async updateStep(stepId: string, input: unknown) {
    const d = stepCreateSchema.partial().parse(input);
    return prisma.productionStep.update({
      where: { id: stepId },
      data: {
        order: d.order,
        title: d.title,
        instruction: d.instruction,
        videoUrl: d.videoUrl === undefined ? undefined : orNull(d.videoUrl),
        pdfUrl: d.pdfUrl === undefined ? undefined : orNull(d.pdfUrl),
        requiresInput: d.requiresInput,
        inputLabel: d.inputLabel === undefined ? undefined : orNull(d.inputLabel),
      },
    });
  },

  deleteStep(stepId: string) {
    return prisma.productionStep.delete({ where: { id: stepId } });
  },

  addBom(stepId: string, input: unknown) {
    const d = bomCreateSchema.parse(input);
    return prisma.bomItem.create({
      data: { stepId, componentId: d.componentId, quantity: d.quantity },
    });
  },

  deleteBom(bomId: string) {
    return prisma.bomItem.delete({ where: { id: bomId } });
  },
};
