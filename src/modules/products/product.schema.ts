import { z } from "zod";

export const productCreateSchema = z.object({
  sku: z.string().trim().min(1, "SKU erforderlich"),
  name: z.string().trim().min(1, "Name erforderlich"),
  description: z.string().trim().optional().or(z.literal("")),
  category: z.string().trim().optional().or(z.literal("")), // Kategoriename (find-or-create)
  priceNet: z.coerce.number().min(0, "Preis >= 0"),
  taxRate: z.coerce.number().min(0).max(100).default(19),
  stockQty: z.coerce.number().int().default(0),
  minStock: z.coerce.number().int().min(0).default(0),
  unit: z.string().trim().default("Stück"),
  active: z.coerce.boolean().optional().default(true),
});

export const productUpdateSchema = z.object({
  sku: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullish().or(z.literal("")),
  category: z.string().trim().nullish().or(z.literal("")),
  priceNet: z.coerce.number().min(0).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  stockQty: z.coerce.number().int().optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  unit: z.string().trim().optional(),
  active: z.coerce.boolean().optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

/** Bestands-Ampel: rot = 0, orange = <= minStock, grün sonst. */
export function stockLevel(stockQty: number, minStock: number): "rot" | "orange" | "gruen" {
  if (stockQty <= 0) return "rot";
  if (stockQty <= minStock) return "orange";
  return "gruen";
}
