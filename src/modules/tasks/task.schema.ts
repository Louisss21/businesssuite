import { z } from "zod";

export const taskStatuses = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const fields = {
  title: z.string().trim().min(1, "Titel erforderlich"),
  description: z.string().trim().optional().or(z.literal("")),
  assignedToId: z.string().optional().or(z.literal("")),
  relatedCustomerId: z.string().optional().or(z.literal("")),
  relatedLeadId: z.string().optional().or(z.literal("")),
  dueAt: z.coerce.date().nullable().optional().or(z.literal("")),
  status: z.enum(taskStatuses).default("OPEN"),
  priority: z.enum(priorities).default("MEDIUM"),
};

export const taskCreateSchema = z.object(fields);
export const taskUpdateSchema = z.object(fields).partial();

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;

export const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Niedrig",
  MEDIUM: "Mittel",
  HIGH: "Hoch",
  URGENT: "Dringend",
};
