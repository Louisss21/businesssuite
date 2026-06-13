import { z } from "zod";

export const quoteStatuses = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
] as const;

export const quoteItemSchema = z.object({
  productId: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Bezeichnung erforderlich"),
  qty: z.coerce.number().positive("Menge > 0"),
  unitPrice: z.coerce.number().min(0, "Preis >= 0"),
  discountPct: z.coerce.number().min(0).max(100).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(19),
});

export const quoteCreateSchema = z.object({
  customerId: z.string().cuid("Kunde erforderlich"),
  status: z.enum(quoteStatuses).default("DRAFT"),
  validUntil: z.coerce.date().nullable().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  items: z.array(quoteItemSchema).min(1, "Mindestens eine Position"),
});

export const quoteUpdateSchema = z.object({
  status: z.enum(quoteStatuses).optional(),
  validUntil: z.coerce.date().nullable().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  items: z.array(quoteItemSchema).optional(),
});

export type QuoteItemInput = z.infer<typeof quoteItemSchema>;

/** Beträge einer Angebotsposition (Float-basiert, inkl. Rabatt). */
export function computeQuoteItem(it: {
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
}) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const net = r2(it.qty * it.unitPrice * (1 - it.discountPct / 100));
  const tax = r2((net * it.taxRate) / 100);
  return { net, tax, gross: r2(net + tax) };
}
