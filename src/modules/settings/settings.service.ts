import { prisma } from "@/lib/db";
import { z } from "zod";

const SINGLETON = "singleton";

export const settingsSchema = z.object({
  companyName: z.string().trim().default(""),
  street: z.string().trim().default(""),
  postalCode: z.string().trim().default(""),
  city: z.string().trim().default(""),
  country: z.string().trim().default("DE"),
  email: z.string().email().or(z.literal("")).default(""),
  phone: z.string().trim().default(""),
  taxNumber: z.string().trim().default(""),
  vatId: z.string().trim().default(""),
  bankName: z.string().trim().default(""),
  iban: z.string().trim().default(""),
  bic: z.string().trim().default(""),
  invoiceNumberFormat: z.string().trim().default("INV-{YYYY}-{SEQ:4}"),
  orderNumberFormat: z.string().trim().default("ORD-{YYYY}-{SEQ:4}"),
  quoteNumberFormat: z.string().trim().default("QUO-{YYYY}-{SEQ:4}"),
  defaultPaymentTermDays: z.coerce.number().int().min(0).max(365).default(14),
  defaultTaxRate: z.coerce.number().min(0).max(100).default(19),
  invoiceFooter: z.string().trim().default("Vielen Dank für Ihren Auftrag."),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

export const settingsService = {
  /** Liefert die Settings, legt bei Bedarf den Singleton an. */
  async get() {
    return prisma.companySettings.upsert({
      where: { id: SINGLETON },
      update: {},
      create: { id: SINGLETON },
    });
  },

  async update(input: unknown) {
    const data = settingsSchema.parse(input);
    return prisma.companySettings.upsert({
      where: { id: SINGLETON },
      update: data,
      create: { id: SINGLETON, ...data },
    });
  },
};
