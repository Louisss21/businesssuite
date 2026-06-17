import { z } from "zod";
import { prisma } from "@/lib/db";
import { notFound } from "@/lib/http";

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name erforderlich"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
});

/** Punkt 2.4: einfache Lieferantenverwaltung (Basis für Bauteil-Zuordnung & Nachbestellung). */
export const supplierService = {
  list() {
    return prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { components: true } } },
    });
  },

  create(input: unknown) {
    const d = supplierSchema.parse(input);
    return prisma.supplier.create({
      data: { name: d.name, email: d.email || null, phone: d.phone || null },
    });
  },

  async update(id: string, input: unknown) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw notFound("Lieferant nicht gefunden");
    const d = supplierSchema.parse(input);
    return prisma.supplier.update({
      where: { id },
      data: { name: d.name, email: d.email || null, phone: d.phone || null },
    });
  },

  /** Löschen: verknüpfte Bauteile bleiben erhalten (Component.supplier onDelete SetNull). */
  async remove(id: string) {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw notFound("Lieferant nicht gefunden");
    return prisma.supplier.delete({ where: { id } });
  },
};
