import { z } from "zod";

export const campaignTypes = ["POST", "EMAIL", "PHONE", "MIXED"] as const;
export const campaignStatuses = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"] as const;

export const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  POST: "Post", EMAIL: "E-Mail", PHONE: "Telefon", MIXED: "Gemischt",
};

const base = {
  name: z.string().trim().min(1, "Name erforderlich"),
  type: z.enum(campaignTypes).default("POST"),
  status: z.enum(campaignStatuses).default("DRAFT"),
  startDate: z.coerce.date().nullable().optional().or(z.literal("")),
  endDate: z.coerce.date().nullable().optional().or(z.literal("")),
  budget: z.coerce.number().min(0).nullable().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
};

export const campaignCreateSchema = z.object(base);
export const campaignUpdateSchema = z.object(base).partial();

/** Zielgruppen-Filter für den Empfänger-Builder (auf Kundenbasis). */
export const targetFilterSchema = z.object({
  customerType: z.enum(["COMPANY", "PRIVATE"]).optional().or(z.literal("")),
  plzFrom: z.string().trim().optional().or(z.literal("")),
  plzTo: z.string().trim().optional().or(z.literal("")),
  classification: z.string().trim().optional().or(z.literal("")),
  noPurchaseMonths: z.coerce.number().int().min(0).optional().or(z.literal("")),
});

export type TargetFilter = z.infer<typeof targetFilterSchema>;
