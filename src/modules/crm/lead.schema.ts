import { z } from "zod";

export const leadStatuses = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "WON",
] as const;

export const leadCreateSchema = z.object({
  title: z.string().trim().min(1, "Titel erforderlich"),
  status: z.enum(leadStatuses).default("NEW"),
  notes: z.string().trim().optional(),
  customerId: z.string().cuid().optional().nullable(),
});

export const leadUpdateSchema = leadCreateSchema.partial();

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
