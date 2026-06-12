import { z } from "zod";

export const customerCreateSchema = z
  .object({
    type: z.enum(["COMPANY", "PRIVATE"]).default("COMPANY"),
    companyName: z.string().trim().min(1).optional(),
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().trim().optional(),
    street: z.string().trim().optional(),
    postalCode: z.string().trim().optional(),
    city: z.string().trim().optional(),
    country: z.string().trim().default("DE"),
    vatId: z.string().trim().optional(),
    taxNumber: z.string().trim().optional(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (d) =>
      d.type === "COMPANY"
        ? !!d.companyName
        : !!(d.firstName && d.lastName),
    {
      message:
        "Firmenkunde benötigt einen Firmennamen, Privatkunde Vor- und Nachnamen.",
    },
  );

// Update: alle Felder optional (refine entfällt, da Teil-Updates erlaubt sind).
export const customerUpdateSchema = z.object({
  type: z.enum(["COMPANY", "PRIVATE"]).optional(),
  companyName: z.string().trim().nullish(),
  firstName: z.string().trim().nullish(),
  lastName: z.string().trim().nullish(),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().trim().nullish(),
  street: z.string().trim().nullish(),
  postalCode: z.string().trim().nullish(),
  city: z.string().trim().nullish(),
  country: z.string().trim().optional(),
  vatId: z.string().trim().nullish(),
  taxNumber: z.string().trim().nullish(),
  notes: z.string().trim().nullish(),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;

export const contactSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().optional(),
  position: z.string().trim().optional(),
  isPrimary: z.boolean().default(false),
});

export type ContactInput = z.infer<typeof contactSchema>;
