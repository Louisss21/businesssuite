/**
 * Zentraler E-Mail-Versand über die Resend REST-API (kein zusätzliches Paket).
 * Aktiv, sobald RESEND_API_KEY gesetzt ist – sonst No-op (loggt nur),
 * damit Build & Laufzeit ohne Mail-Konfiguration nicht brechen.
 */

export interface MailAttachment {
  filename: string;
  /** Base64-kodierter Inhalt. */
  content: string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: MailAttachment[];
  /** Optionaler Absender ("Name <mail@domain>"); sonst MAIL_FROM. */
  from?: string;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

const DEFAULT_FROM = "BusinessSuite <onboarding@resend.dev>";

/** Zentrale, wiederverwendbare Versandfunktion (HTML/Text + Anhänge). */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  const from = opts.from || process.env.MAIL_FROM || DEFAULT_FROM;

  if (!opts.to) return { ok: false, error: "Keine Empfängeradresse" };
  if (!key) {
    console.log(`[mail:skip] an=${opts.to} betreff="${opts.subject}" (kein RESEND_API_KEY)`);
    return { ok: false, skipped: true, error: "RESEND_API_KEY nicht gesetzt" };
  }

  const body: Record<string, unknown> = {
    from,
    to: opts.to,
    subject: opts.subject,
  };
  if (opts.html) body.html = opts.html;
  if (opts.text) body.text = opts.text;
  if (!opts.html && !opts.text) body.text = opts.subject;
  if (opts.attachments?.length) {
    body.attachments = opts.attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      ...(a.contentType ? { content_type: a.contentType } : {}),
    }));
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[mail:fail] ${res.status} ${detail}`);
      return { ok: false, error: `Versand fehlgeschlagen (${res.status})` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[mail:error]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
  }
}

/** Backward-kompatibler Text-Versand (bestehende Aufrufer). */
export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  const r = await sendEmail({ to, subject, text });
  return r.ok;
}
