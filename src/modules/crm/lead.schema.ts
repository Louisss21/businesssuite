import { z } from "zod";

export const leadStatuses = [
  "NEW",
  "CONTACTED",
  "CONTACTED_2",
  "CONTACTED_3",
  "QUALIFIED",
  "LOST",
  "WON",
] as const;

/**
 * Kontakt-Stufen zum Dokumentieren des Nachhakens. Alle drei zaehlen als
 * 'kontaktiert': Beim Wechsel in eine dieser Stufen startet der
 * Wiedervorlage-Zyklus neu (contactedAt + followupTaskCreated), damit die
 * 14-Tage-Automatik nach jedem Nachhaken erneut greift.
 */
export const contactedStatuses = ["CONTACTED", "CONTACTED_2", "CONTACTED_3"] as const;

export const isContactedStatus = (s: string | null | undefined): boolean =>
  contactedStatuses.includes(s as never);

/** Anzeigenamen der Lead-Status (zentral, damit die Listen nicht auseinanderlaufen). */
export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: "Neu",
  CONTACTED: "Kontaktiert",
  CONTACTED_2: "Kontaktiert 2",
  CONTACTED_3: "Kontaktiert 3",
  QUALIFIED: "Qualifiziert",
  WON: "Gewonnen",
  LOST: "Verloren",
};

/** Status in Bearbeitung (noch nicht gewonnen/verloren) - z. B. fuer KPIs. */
export const openLeadStatuses = [
  "NEW",
  "CONTACTED",
  "CONTACTED_2",
  "CONTACTED_3",
  "QUALIFIED",
] as const;

/** Auswahlliste in fachlicher Reihenfolge (Neu -> Nachhaken -> Abschluss). */
export const LEAD_STATUS_OPTIONS = [
  "NEW",
  "CONTACTED",
  "CONTACTED_2",
  "CONTACTED_3",
  "QUALIFIED",
  "WON",
  "LOST",
].map((value) => ({ value, label: LEAD_STATUS_LABELS[value] }));

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
