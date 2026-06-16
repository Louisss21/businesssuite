import { NextRequest } from "next/server";
import { AppError, fail, ok } from "@/lib/http";
import { gmailImportService } from "@/modules/billing-archive/gmail-import.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * A6.2: Stündlicher Cron (siehe vercel.json). Scannt das Gmail-Postfach nach
 * neuen Rechnungs-Mails und legt Eingangsrechnungen an. Idempotent (Dedupe über
 * Gmail-Message-ID + Mail wird als gelesen markiert).
 *
 * Schutz: Ist CRON_SECRET gesetzt, muss der Vercel-Cron-Header passen.
 * Gibt 503 zurück, solange die GMAIL_*-Variablen nicht konfiguriert sind.
 */
export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) throw new AppError("Nicht autorisiert", 401);
    }
    const result = await gmailImportService.scan();
    return ok(result);
  } catch (e) {
    return fail(e);
  }
}
