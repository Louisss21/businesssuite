import { z } from "zod";

export const leadStatuses = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "LOST",
  "WON",
] as const;

const fields = {
  title: z.string().trim().min(1, "Titel erforderlich"),
  status: z.enum(leadStatuses).default("NEW"),
  notes: z.string().trim().optional().or(z.literal("")),
  firstName: z.string().trim().optional().or(z.literal("")),
  lastName: z.string().trim().optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  company: z.string().trim().optional().or(z.literal("")),
  position: z.string().trim().optional().or(z.literal("")),
  score: z.coerce.number().int().min(0).max(100).optional(),
  tags: z.string().optional(), // Komma-getrennt im Formular
  source: z.string().trim().optional().or(z.literal("")),
  lostReason: z.string().trim().optional().or(z.literal("")),
  assignedUserId: z.string().optional().or(z.literal("")),
  customerId: z.string().cuid().optional().nullable().or(z.literal("")),
};

export const leadCreateSchema = z.object(fields);
export const leadUpdateSchema = z.object(fields).partial();

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;

export function splitTags(tags?: string): string[] {
  return (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
