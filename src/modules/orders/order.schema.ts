import { z } from "zod";

export const orderStatuses = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export const orderItemSchema = z.object({
  productName: z.string().trim().min(1, "Produktname erforderlich"),
  quantity: z.coerce.number().positive("Menge > 0"),
  unitPrice: z.coerce.number().min(0, "Preis >= 0"),
  taxRate: z.coerce.number().min(0).max(100).default(19),
});

export const orderCreateSchema = z.object({
  customerId: z.string().cuid("Kunde erforderlich"),
  status: z.enum(orderStatuses).default("DRAFT"),
  notes: z.string().trim().optional(),
  items: z.array(orderItemSchema).min(1, "Mindestens eine Position"),
});

export const orderUpdateSchema = z.object({
  status: z.enum(orderStatuses).optional(),
  notes: z.string().trim().optional(),
  items: z.array(orderItemSchema).optional(),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderItemInput = z.infer<typeof orderItemSchema>;
