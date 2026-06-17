import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/http";
import { computeLineAmounts, sumTotals } from "@/lib/money";
import { nextNumber } from "@/modules/shared/numbering.service";
import { settingsService } from "@/modules/settings/settings.service";

/**
 * WooCommerce-Anbindung (Teil 2). Empfängt Order-Webhooks, prüft die HMAC-
 * Signatur, mappt Kunde + Bestellung + Positionen (über SKU) und hält den
 * Fertigerzeugnis-Bestand konsistent:
 *  - bei bezahlten/bestätigten Bestellungen wird der Bestand abgebucht,
 *    fehlt Bestand, werden Produktionsaufträge erzeugt;
 *  - bei Storno wird der zuvor abgebuchte Bestand zurückgebucht.
 * Idempotent über Order.externalId (WooCommerce-Order-ID) + stockReduced-Flag.
 */

type OrderStatus = "DRAFT" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface WooBilling {
  first_name?: string;
  last_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address_1?: string;
  postcode?: string;
  city?: string;
}
interface WooLineItem {
  sku?: string;
  name?: string;
  quantity?: number;
  price?: number | string;
}
export interface WooOrder {
  id?: number | string;
  number?: string;
  status?: string;
  currency?: string;
  payment_method?: string;
  payment_method_title?: string;
  transaction_id?: string;
  date_paid?: string | null;
  date_paid_gmt?: string | null;
  billing?: WooBilling;
  line_items?: WooLineItem[];
}

interface PaymentInfo {
  paymentMethod: string | null;
  paymentReference: string | null;
  currency: string;
  paidAt: Date | null;
}

function extractPayment(p: WooOrder): PaymentInfo {
  const paidRaw = p.date_paid || p.date_paid_gmt || null;
  const paidAt = paidRaw && !isNaN(Date.parse(paidRaw)) ? new Date(paidRaw) : null;
  return {
    paymentMethod: p.payment_method_title || p.payment_method || null,
    paymentReference: p.transaction_id || null,
    currency: (p.currency || "EUR").toUpperCase(),
    paidAt,
  };
}

const STATUS_MAP: Record<string, OrderStatus> = {
  pending: "DRAFT",
  "on-hold": "DRAFT",
  "checkout-draft": "DRAFT",
  processing: "CONFIRMED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  refunded: "CANCELLED",
  failed: "CANCELLED",
};

// Status, bei denen der Fertigerzeugnis-Bestand abgebucht sein soll.
const FULFILLING: OrderStatus[] = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"];

/** WooCommerce signiert den Raw-Body: base64( HMAC-SHA256(body, secret) ). */
export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const woocommerceService = {
  verifySignature,

  /** Kunde anhand der E-Mail finden oder neu anlegen. */
  async upsertCustomer(tx: Prisma.TransactionClient, b: WooBilling | undefined) {
    const email = (b?.email || "").trim().toLowerCase();
    if (email) {
      const existing = await tx.customer.findFirst({ where: { email } });
      if (existing) return existing;
    }
    const isCompany = !!(b?.company && b.company.trim());
    return tx.customer.create({
      data: {
        type: isCompany ? "COMPANY" : "PRIVATE",
        companyName: isCompany ? b!.company!.trim() : null,
        firstName: b?.first_name?.trim() || null,
        lastName: b?.last_name?.trim() || null,
        email: email || null,
        phone: b?.phone?.trim() || null,
        street: b?.address_1?.trim() || null,
        postalCode: b?.postcode?.trim() || null,
        city: b?.city?.trim() || null,
        source: "Online-Shop",
      },
    });
  },

  /**
   * Bestand abbuchen (deduct) bzw. zurückbuchen (rebook). Beim Abbuchen wird
   * bei Unterdeckung je fehlender Einheit ein Produktionsauftrag erzeugt.
   */
  async applyStock(
    tx: Prisma.TransactionClient,
    matched: { productId: string; quantity: number }[],
    direction: "deduct" | "rebook",
  ) {
    for (const { productId, quantity } of matched) {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) continue;

      if (direction === "rebook") {
        await tx.product.update({
          where: { id: productId },
          data: { stockQty: product.stockQty + quantity },
        });
        continue;
      }

      const available = product.stockQty;
      await tx.product.update({
        where: { id: productId },
        data: { stockQty: Math.max(0, available - quantity) },
      });

      const shortfall = quantity - available;
      if (shortfall > 0) {
        // Produktionsbedarf: zum Produkt verknüpftes Tischmodell finden.
        const model = await tx.tableModel.findFirst({ where: { productId } });
        if (model) {
          for (let i = 0; i < shortfall; i++) {
            await tx.productionOrder.create({
              data: { tableModelId: model.id, status: "IN_PROGRESS", currentStep: 1 },
            });
          }
        }
      }
    }
  },

  /** Webhook verarbeiten (nach erfolgreicher Signaturprüfung). */
  async handleOrder(payload: WooOrder) {
    if (payload.id === undefined || payload.id === null) {
      throw new AppError("WooCommerce-Order ohne ID");
    }
    const externalId = String(payload.id);
    const status: OrderStatus = STATUS_MAP[(payload.status || "").toLowerCase()] ?? "DRAFT";
    const lineItems = payload.line_items ?? [];

    const settings = await settingsService.get();
    const year = new Date().getFullYear();

    return prisma.$transaction(async (tx) => {
      // Positionen über SKU mappen
      const products = await tx.product.findMany({
        where: { sku: { in: lineItems.map((li) => li.sku ?? "").filter(Boolean) } },
      });
      const bySku = new Map(products.map((p) => [p.sku, p]));

      const itemInputs = lineItems.map((li) => {
        const p = li.sku ? bySku.get(li.sku) : undefined;
        return {
          productName: p?.name ?? li.name ?? "Position",
          quantity: num(li.quantity) || 1,
          unitPrice: num(li.price),
          taxRate: p ? p.taxRate : 19,
          productId: p?.id,
        };
      });
      const matched = itemInputs
        .filter((it) => it.productId)
        .map((it) => ({ productId: it.productId as string, quantity: it.quantity }));

      const computed = itemInputs.map((it, i) => ({
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate,
        ...computeLineAmounts({ quantity: it.quantity, unitPrice: it.unitPrice, taxRate: it.taxRate }),
        sortOrder: i,
      }));
      const totals = sumTotals(computed);

      const payment = extractPayment(payload);
      const shopOrderNumber = payload.number ? String(payload.number) : null;
      // Position(en) ohne SKU oder ohne Produkt-Treffer -> Bestand nicht reduziert.
      const hasUnmatchedSku = lineItems.some((li) => !li.sku || !bySku.get(li.sku));

      const existing = await tx.order.findUnique({ where: { externalId } });

      // ---- Bereits bekannt: nur Status/Bestand abgleichen (idempotent) ----
      if (existing) {
        const shouldFulfill = FULFILLING.includes(status);
        let stockReduced = existing.stockReduced;

        if (status === "CANCELLED" && existing.stockReduced) {
          await this.applyStock(tx, matched, "rebook");
          stockReduced = false;
        } else if (shouldFulfill && !existing.stockReduced) {
          await this.applyStock(tx, matched, "deduct");
          stockReduced = true;
        }

        const updated = await tx.order.update({
          where: { id: existing.id },
          data: {
            status,
            stockReduced,
            shopOrderNumber,
            hasUnmatchedSku,
            paymentMethod: payment.paymentMethod,
            paymentReference: payment.paymentReference,
            currency: payment.currency,
            paidAt: payment.paidAt ?? existing.paidAt,
          },
        });
        // Bezahlt im Shop -> ggf. verknüpfte Rechnung als bezahlt markieren.
        if (payment.paidAt) {
          await tx.invoice.updateMany({
            where: { orderId: existing.id, status: { not: "CANCELLED" } },
            data: {
              status: "PAID",
              paidAt: payment.paidAt,
              paymentMethod: payment.paymentMethod,
              paymentReference: payment.paymentReference,
              currency: payment.currency,
            },
          });
        }
        return { action: "updated", orderId: updated.id, status, stockReduced, hasUnmatchedSku };
      }

      // ---- Neu anlegen ----
      const customer = await this.upsertCustomer(tx, payload.billing);
      const orderNumber = await nextNumber(tx, "order", year, settings.orderNumberFormat);
      const shouldFulfill = FULFILLING.includes(status);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status,
          source: "ONLINESHOP",
          externalId,
          externalSource: "woocommerce",
          shopOrderNumber,
          hasUnmatchedSku,
          stockReduced: false,
          paymentMethod: payment.paymentMethod,
          paymentReference: payment.paymentReference,
          currency: payment.currency,
          paidAt: payment.paidAt,
          notes: `Aus WooCommerce-Bestellung #${externalId}`,
          netTotal: totals.netTotal,
          taxTotal: totals.taxTotal,
          grossTotal: totals.grossTotal,
          items: { create: computed },
        },
      });

      let stockReduced = false;
      if (shouldFulfill) {
        await this.applyStock(tx, matched, "deduct");
        stockReduced = true;
        await tx.order.update({ where: { id: order.id }, data: { stockReduced: true } });
      }

      return { action: "created", orderId: order.id, status, stockReduced, hasUnmatchedSku };
    });
  },
};
