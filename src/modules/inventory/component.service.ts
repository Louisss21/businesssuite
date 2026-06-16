import { z } from "zod";
import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { sendMail } from "@/lib/email";
import { settingsService } from "@/modules/settings/settings.service";

export const componentUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullish().or(z.literal("")),
  unit: z.string().trim().optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  reorderEmail: z.string().email().nullish().or(z.literal("")),
});

export const stockAdjustSchema = z.object({
  delta: z.coerce.number().int(),
  reason: z.string().trim().min(1, "Grund erforderlich"),
});

export type StockLevel = "rot" | "orange" | "gruen";
export function level(stockQty: number, minStock: number): StockLevel {
  if (stockQty <= 0) return "rot";
  if (stockQty <= minStock) return "orange";
  return "gruen";
}

export const componentService = {
  async list(query?: { underMin?: boolean; search?: string }) {
    const all = await prisma.component.findMany({
      where: query?.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { sku: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
    });
    return query?.underMin ? all.filter((c) => c.stockQty <= c.minStock) : all;
  },

  async getById(id: string) {
    const c = await prisma.component.findUnique({
      where: { id },
      include: { supplier: true, movements: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!c) throw notFound("Bauteil nicht gefunden");
    return c;
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const d = componentUpdateSchema.parse(input);
    return prisma.component.update({
      where: { id },
      data: {
        name: d.name,
        description: d.description === undefined ? undefined : d.description || null,
        unit: d.unit,
        minStock: d.minStock,
        reorderEmail: d.reorderEmail === undefined ? undefined : d.reorderEmail || null,
      },
    });
  },

  /** B3: Mindestbestand für mehrere Bauteile gleichzeitig setzen (kein Löschen im Lager). */
  async bulkUpdate(ids: string[], changes: { minStock?: number | string }) {
    if (changes.minStock === undefined || changes.minStock === "") return { updated: 0 };
    const minStock = Number(changes.minStock);
    if (!Number.isInteger(minStock) || minStock < 0) {
      throw new AppError("Mindestbestand muss eine ganze Zahl ≥ 0 sein.", 422);
    }
    const res = await prisma.component.updateMany({
      where: { id: { in: ids } },
      data: { minStock },
    });
    return { updated: res.count };
  },

  /** Manueller Bestandseingang/-korrektur (delta>0 = Zugang, delta<0 = Abgang). */
  async adjustStock(id: string, input: unknown) {
    const c = await this.getById(id);
    const { delta, reason } = stockAdjustSchema.parse(input);
    if (c.stockQty + delta < 0) {
      throw new AppError(
        `Bestand darf nicht negativ werden (aktuell ${c.stockQty}, Buchung ${delta}).`,
        422,
      );
    }
    return prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          componentId: id,
          quantity: delta,
          direction: delta >= 0 ? "IN" : "OUT",
          reason,
        },
      });
      return tx.component.update({
        where: { id },
        data: { stockQty: c.stockQty + delta },
      });
    });
  },

  /**
   * Prüft die übergebenen Bauteile auf Mindestbestand und versendet
   * (max. 1× täglich je Bauteil) eine Nachbestell-Aufforderung.
   * Gibt die IDs der betroffenen Bauteile zurück.
   */
  async notifyLowStock(componentIds: string[]): Promise<string[]> {
    if (componentIds.length === 0) return [];
    const settings = await settingsService.get();
    const comps = await prisma.component.findMany({ where: { id: { in: componentIds } } });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const affected: string[] = [];
    for (const c of comps) {
      if (c.stockQty > c.minStock) continue;
      affected.push(c.id);
      if (c.lastReorderNotifiedAt && c.lastReorderNotifiedAt >= startOfDay) continue; // heute schon

      const to = c.reorderEmail || settings.purchasingEmail || settings.email;
      if (!to) continue;
      const reorderQty = Math.max(c.minStock * 2 - c.stockQty, c.minStock);
      await sendMail(
        to,
        `Nachbestellung erforderlich: ${c.name} (${c.sku})`,
        [
          `Das Bauteil "${c.name}" (${c.sku}) hat den Mindestbestand erreicht oder unterschritten.`,
          ``,
          `Aktueller Bestand: ${c.stockQty} ${c.unit}`,
          `Mindestbestand:    ${c.minStock} ${c.unit}`,
          `Empfohlene Nachbestellmenge: ${reorderQty} ${c.unit}`,
          ``,
          `– BusinessSuite Lager`,
        ].join("\n"),
      );
      await prisma.component.update({ where: { id: c.id }, data: { lastReorderNotifiedAt: new Date() } });
    }
    return affected;
  },
};
