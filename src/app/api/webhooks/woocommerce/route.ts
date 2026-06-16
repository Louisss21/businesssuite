import { NextRequest } from "next/server";
import { AppError, fail, ok } from "@/lib/http";
import { woocommerceService, type WooOrder } from "@/modules/integrations/woocommerce.service";

// Node-Runtime: Raw-Body wird für die HMAC-Signaturprüfung benötigt.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * WooCommerce-Webhook (Teil 2). Verifiziert die HMAC-Signatur, verarbeitet
 * Order-Events idempotent und hält den Fertigerzeugnis-Bestand konsistent.
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
    if (!secret) {
      throw new AppError("WooCommerce-Webhook nicht konfiguriert (WOOCOMMERCE_WEBHOOK_SECRET fehlt).", 503);
    }

    const raw = await req.text();
    const signature = req.headers.get("x-wc-webhook-signature");
    if (!woocommerceService.verifySignature(raw, signature, secret)) {
      throw new AppError("Ungültige Webhook-Signatur", 401);
    }

    // Ping/leerer Body (z. B. beim Anlegen des Webhooks) bestätigen.
    if (!raw.trim()) return ok({ pong: true });

    let payload: WooOrder & { webhook_id?: number };
    try {
      payload = JSON.parse(raw);
    } catch {
      return ok({ ignored: "kein JSON" });
    }

    // Nur echte Order-Payloads verarbeiten; Pings o. Ä. nur bestätigen.
    if (payload && payload.id !== undefined && (payload.line_items || payload.billing || payload.status)) {
      const result = await woocommerceService.handleOrder(payload);
      return ok(result);
    }
    return ok({ ignored: true });
  } catch (e) {
    return fail(e);
  }
}

/** GET ist nicht erlaubt – Nachweis, dass die Route existiert (405 statt 404). */
export async function GET() {
  return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
    status: 405,
    headers: { "Content-Type": "application/json", Allow: "POST" },
  });
}
