import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { gmailImportService } from "@/modules/billing-archive/gmail-import.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** A6.2: Manueller Postfach-Scan durch eingeloggte Nutzer (unabhängig vom Cron). */
export async function POST() {
  try {
    await requireUser();
    return ok(await gmailImportService.scan());
  } catch (e) {
    return fail(e);
  }
}
