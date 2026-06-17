import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { sendEmail } from "@/lib/email";
import { settingsService } from "@/modules/settings/settings.service";
import { componentService } from "@/modules/inventory/component.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Punkt 2: Test-Nachbestellung. Schickt eine Beispiel-Nachbestellmail an die
 * Einkaufsadresse und listet die aktuell unter Mindestbestand liegenden
 * Bauteile auf (umgeht die Tages-Dedupe der echten Benachrichtigung).
 */
export async function POST() {
  try {
    await requireUser();
    const settings = await settingsService.get();
    const to = settings.purchasingEmail || settings.email;
    if (!to) {
      return ok({ sent: false, error: "Keine Einkaufs-/Absenderadresse in den Einstellungen hinterlegt." });
    }
    const low = await componentService.list({ underMin: true });
    const lines = low.length
      ? low.map((c) => `• ${c.name} (${c.sku}): ${c.stockQty}/${c.minStock} ${c.unit}`)
      : ["(Aktuell kein Bauteil unter Mindestbestand.)"];

    const r = await sendEmail({
      to,
      subject: `Test-Nachbestellung – ${low.length} Bauteil(e) unter Mindestbestand`,
      text: [
        "Dies ist eine Test-Nachbestellmail aus BusinessSuite.",
        "",
        "Aktuell unter Mindestbestand:",
        ...lines,
        "",
        "– BusinessSuite Lager",
      ].join("\n"),
    });

    return ok({ sent: r.ok, skipped: r.skipped, to, lowCount: low.length, error: r.error });
  } catch (e) {
    return fail(e);
  }
}
