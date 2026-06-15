import { z } from "zod";

export const activityTypes = ["NOTE", "CALL", "EMAIL", "MEETING", "VISIT"] as const;

export const ACTIVITY_LABELS: Record<string, string> = {
  NOTE: "Notiz",
  CALL: "Anruf",
  EMAIL: "E-Mail",
  MEETING: "Meeting",
  VISIT: "Besuch",
};

export const activityCreateSchema = z
  .object({
    type: z.enum(activityTypes).default("NOTE"),
    subject: z.string().trim().min(1, "Betreff erforderlich"),
    body: z.string().trim().optional().or(z.literal("")),
    customerId: z.string().optional().or(z.literal("")),
    leadId: z.string().optional().or(z.literal("")),
  })
  .refine((d) => !!d.customerId || !!d.leadId, {
    message: "Aktivität muss einem Kunden oder Lead zugeordnet sein.",
  });

export type ActivityCreateInput = z.infer<typeof activityCreateSchema>;
