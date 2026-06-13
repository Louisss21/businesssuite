import { z } from "zod";

export const invoiceStatuses = ["OPEN", "PAID", "OVERDUE"] as const;

/** Rechnung wird aus einer Bestellung erzeugt. */
export const invoiceFromOrderSchema = z.object({
  orderId: z.string().cuid(),
  issueDate: z.coerce.date().optional(), // default: heute
  dueDate: z.coerce.date().optional(), // default: issueDate + Zahlungsziel
});

export const invoiceUpdateSchema = z.object({
  status: z.enum(invoiceStatuses).optional(),
  dueDate: z.coerce.date().optional(),
});

export type InvoiceFromOrderInput = z.infer<typeof invoiceFromOrderSchema>;
