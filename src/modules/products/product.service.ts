import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { productCreateSchema, productUpdateSchema } from "./product.schema";

async function resolveCategoryId(name?: string | null): Promise<string | null> {
  const n = (name ?? "").trim();
  if (!n) return null;
  const existing = await prisma.productCategory.findFirst({ where: { name: n } });
  if (existing) return existing.id;
  const created = await prisma.productCategory.create({ data: { name: n } });
  return created.id;
}

function mapUniqueError(e: unknown): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    throw new AppError("SKU bereits vergeben.", 409);
  }
  throw e;
}

export const productService = {
  list(query?: { search?: string; active?: boolean }) {
    return prisma.product.findMany({
      where: {
        active: query?.active,
        OR: query?.search
          ? [
              { name: { contains: query.search, mode: "insensitive" } },
              { sku: { contains: query.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
  },

  /** Schlanke Liste für Produkt-Dropdown in Bestellungen. */
  listActiveSimple() {
    return prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, sku: true, name: true, priceNet: true, taxRate: true, unit: true },
    });
  },

  async getById(id: string) {
    const p = await prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!p) throw notFound("Produkt nicht gefunden");
    return p;
  },

  async create(input: unknown) {
    const data = productCreateSchema.parse(input);
    const categoryId = await resolveCategoryId(data.category);
    try {
      return await prisma.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description || null,
          categoryId,
          priceNet: data.priceNet,
          taxRate: data.taxRate,
          stockQty: data.stockQty,
          minStock: data.minStock,
          unit: data.unit,
          active: data.active,
        },
      });
    } catch (e) {
      mapUniqueError(e);
    }
  },

  async update(id: string, input: unknown) {
    await this.getById(id);
    const data = productUpdateSchema.parse(input);
    const categoryId =
      data.category !== undefined ? await resolveCategoryId(data.category) : undefined;
    try {
      return await prisma.product.update({
        where: { id },
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description ?? undefined,
          categoryId,
          priceNet: data.priceNet,
          taxRate: data.taxRate,
          stockQty: data.stockQty,
          minStock: data.minStock,
          unit: data.unit,
          active: data.active,
        },
      });
    } catch (e) {
      mapUniqueError(e);
    }
  },

  delete(id: string) {
    return prisma.product.delete({ where: { id } });
  },

  /** Punkt 1: vollständige Kopie (neue eindeutige SKU, Name + "(Kopie)", Bestand 0). */
  async duplicate(id: string) {
    const src = await this.getById(id);
    return prisma.$transaction(async (tx) => {
      let candidate = `${src.sku}-COPY`;
      let i = 1;
      while (await tx.product.findUnique({ where: { sku: candidate } })) {
        i += 1;
        candidate = `${src.sku}-COPY-${i}`;
      }
      return tx.product.create({
        data: {
          sku: candidate,
          name: `${src.name} (Kopie)`,
          description: src.description,
          categoryId: src.categoryId,
          priceNet: src.priceNet,
          taxRate: src.taxRate,
          stockQty: 0, // Bestand NICHT mitkopieren
          minStock: src.minStock,
          unit: src.unit,
          active: src.active,
        },
      });
    });
  },

  /** B2: Produkte löschen – als Fertigerzeugnis in der Produktion referenzierte überspringen. */
  async bulkDelete(ids: string[]) {
    const rows = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, _count: { select: { tableModels: true } } },
    });
    const deletable = rows.filter((p) => p._count.tableModels === 0).map((p) => p.id);
    const skipped = rows
      .filter((p) => p._count.tableModels > 0)
      .map((p) => ({ id: p.id, reason: "in Produktion referenziert" }));
    let deleted = 0;
    if (deletable.length) {
      const res = await prisma.product.deleteMany({ where: { id: { in: deletable } } });
      deleted = res.count;
    }
    return { deleted, skipped };
  },

  /** B3: Aktiv-Status / Kategorie mehrerer Produkte setzen. */
  async bulkUpdate(ids: string[], changes: { active?: string; categoryId?: string }) {
    const data: Record<string, unknown> = {};
    if (changes.active !== undefined) data.active = changes.active === "true";
    if (changes.categoryId) data.categoryId = changes.categoryId;
    if (Object.keys(data).length === 0) return { updated: 0 };
    const res = await prisma.product.updateMany({ where: { id: { in: ids } }, data });
    return { updated: res.count };
  },
};
