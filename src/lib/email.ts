/**
 * Minimaler E-Mail-Versand über die Resend REST-API (kein zusätzliches Paket).
 * Aktiv, sobald RESEND_API_KEY gesetzt ist – sonst No-op (loggt nur),
 * damit Build & Laufzeit ohne Mail-Konfiguration nicht brechen.
 */
export async function sendMail(
  to: string,
  subject: string,
  text: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "BusinessSuite <onboarding@resend.dev>";

  if (!key || !to) {
    console.log(`[mail:skip] an=${to || "—"} betreff="${subject}" (kein RESEND_API_KEY)`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error(`[mail:fail] ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[mail:error]", e);
    return false;
  }
}
