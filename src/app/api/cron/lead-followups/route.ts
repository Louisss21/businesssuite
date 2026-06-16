import { NextRequest } from "next/server";
import { AppError, fail, ok } from "@/lib/http";
import { leadService } from "@/modules/crm/lead.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A4: Täglicher Cron (siehe vercel.json) erzeugt Wiedervorlage-Aufgaben für
 * Leads, die vor 14 Tagen kontaktiert wurden. Idempotent – mehrfacher Aufruf
 * legt keine Duplikate an.
 *
 * Schutz: Ist CRON_SECRET gesetzt, muss der Vercel-Cron-Header passen.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) throw new AppError("Nicht autorisiert", 401);
    }
    const result = await leadService.createDueFollowups();
    return ok(result);
  } catch (e) {
    return fail(e);
  }
}
