import { z } from "zod";

export const userRoles = [
  "ADMIN",
  "SALES",
  "MARKETING",
  "WAREHOUSE",
  "ACCOUNTING",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrator",
  SALES: "Vertrieb",
  MARKETING: "Marketing",
  WAREHOUSE: "Lager",
  ACCOUNTING: "Buchhaltung",
  MEMBER: "Vollzugriff (Legacy)",
};

export const userInviteSchema = z.object({
  email: z.string().email("Gültige E-Mail erforderlich"),
  name: z.string().trim().min(1, "Name erforderlich"),
  role: z.enum(userRoles).default("SALES"),
  // Optionales Initialpasswort – ohne kann sich der Nutzer noch nicht einloggen
  password: z.string().min(6, "Mind. 6 Zeichen").optional().or(z.literal("")),
});

export const userUpdateSchema = z.object({
  email: z.string().email("Gültige E-Mail erforderlich").optional(),
  name: z.string().trim().min(1).optional(),
  role: z.enum(userRoles).optional(),
  active: z.coerce.boolean().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
});

export type UserInviteInput = z.infer<typeof userInviteSchema>;
