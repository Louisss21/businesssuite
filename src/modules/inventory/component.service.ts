import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { sendMail } from "@/lib/email";
import { settingsService } from "@/modules/settings/settings.service";

export const componentCreateSchema = z.object({
  sku: z.string().trim().min(1, "SKU erforderlich"),
  name: z.string().trim().min(1, "Name erforderlich"),
  description: z.string().trim().optional().or(z.literal("")),
  unit: z.string().trim().default("Stück"),
  minStock: z.coerce.number().int().min(0).default(10),
  reorderEmail: z.string().email().optional().or(z.literal("")),
  supplierId: z.string().optional().or(z.literal("")),
});

export const componentUpdateSchema = z.object({
  sku: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullish().or(z.literal("")),
  unit: z.string().trim().optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  reorderEmail: z.string().email().nullish().or(z.literal("")),
  supplierId: z.string().nullish().or(z.literal("")),
});

function mapUniqueError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new AppError("SKU bereits vergeben.", 409);
  }
  throw e;
}

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

  listSuppliers() {
    return prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const d = componentUpdateSchema.parse(input);
    try {
      return await prisma.component.update({
        where: { id },
        data: {
          sku: d.sku,
          name: d.name,
          description: d.description === undefined ? undefined : d.description || null,
          unit: d.unit,
          minStock: d.minStock,
          reorderEmail: d.reorderEmail === undefined ? undefined : d.reorderEmail || null,
          supplierId: d.supplierId === undefined ? undefined : d.supplierId || null,
        },
      });
    } catch (e) {
      mapUniqueError(e);
    }
  },

  /** Punkt 2: neues Bauteil anlegen (Bestand startet bei 0, Zugang via Wareneingang). */
  async create(input: unknown) {
    const d = componentCreateSchema.parse(input);
    try {
      return await prisma.component.create({
        data: {
          sku: d.sku,
          name: d.name,
          description: d.description || null,
          unit: d.unit,
          minStock: d.minStock,
          reorderEmail: d.reorderEmail || null,
          supplierId: d.supplierId || null,
          stockQty: 0,
        },
      });
    } catch (e) {
      mapUniqueError(e);
    }
  },

  /** Punkt 2: Bauteil duplizieren – neue eindeutige SKU, Bestand 0. */
  async duplicate(id: string) {
    const src = await this.getById(id);
    return prisma.$transaction(async (tx) => {
      let candidate = `${src.sku}-COPY`;
      let i = 1;
      while (await tx.component.findUnique({ where: { sku: candidate } })) {
        i += 1;
        candidate = `${src.sku}-COPY-${i}`;
      }
      return tx.component.create({
        data: {
          sku: candidate,
          name: `${src.name} (Kopie)`,
          description: src.description,
          unit: src.unit,
          minStock: src.minStock,
          reorderEmail: src.reorderEmail,
          supplierId: src.supplierId,
          stockQty: 0,
        },
      });
    });
  },

  /** Punkt 2/1.1: Löschen nur, wenn das Bauteil in keiner Stückliste referenziert ist
   *  – mit klarer Meldung, welche Modelle/Schritte es verwenden. */
  async remove(id: string) {
    await this.getById(id);
    const refs = await prisma.bomItem.findMany({
      where: { componentId: id },
      include: { step: { include: { tableModel: { select: { name: true } } } } },
    });
    if (refs.length > 0) {
      const list = refs
        .slice(0, 3)
        .map((r) => `${r.step.tableModel.name} · Schritt „${r.step.title}"`)
        .join("; ");
      const more = refs.length > 3 ? ` und ${refs.length - 3} weitere` : "";
      throw new AppError(
        `Bauteil kann nicht gelöscht werden – wird in ${refs.length} Stücklisten-Position(en) verwendet: ${list}${more}. Bitte zuerst dort entfernen.`,
        409,
      );
    }
    return prisma.component.delete({ where: { id } });
  },

  /** Punkt 2.5: mehrere Bauteile löschen – referenzierte (in Stückliste) werden übersprungen. */
  async bulkDelete(ids: string[]) {
    const refs = await prisma.bomItem.findMany({
      where: { componentId: { in: ids } },
      select: { componentId: true },
    });
    const blocked = new Set(refs.map((r) => r.componentId));
    const deletable = ids.filter((id) => !blocked.has(id));
    const skipped = ids
      .filter((id) => blocked.has(id))
      .map((id) => ({ id, reason: "in Stückliste verwendet" }));
    let deleted = 0;
    if (deletable.length) {
      const res = await prisma.component.deleteMany({ where: { id: { in: deletable } } });
      deleted = res.count;
    }
    return { deleted, skipped };
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
