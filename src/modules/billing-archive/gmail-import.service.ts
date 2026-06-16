import { put } from "@vercel/blob";
import { AppError } from "@/lib/http";
import { incomingInvoiceService } from "./incoming-invoice.service";

/**
 * A6.2: Automatischer Import von Eingangsrechnungen aus einem Gmail-Postfach.
 *
 * Zugang über OAuth-Refresh-Token (kein Passwort). Benötigte Env-Variablen:
 *   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 *   GMAIL_LABEL (optional, Standard "Rechnungen")
 *
 * Ablauf: ungelesene Mails mit PDF-Anhang im Label holen → Anhänge in Blob
 * laden → IncomingInvoice(source=EMAIL) anlegen → Mail als gelesen markieren.
 * Dedupe über die Gmail-Message-ID (sourceRef). Nicht parsebare Betragsfelder
 * bleiben leer (Nachpflege in der UI).
 */

interface GmailHeader {
  name: string;
  value: string;
}
interface GmailPart {
  filename?: string;
  mimeType?: string;
  headers?: GmailHeader[];
  body?: { attachmentId?: string; data?: string; size?: number };
  parts?: GmailPart[];
}
interface GmailMessage {
  id: string;
  payload?: GmailPart;
}

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

function env() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const label = process.env.GMAIL_LABEL || "Rechnungen";
  if (!clientId || !clientSecret || !refreshToken) {
    throw new AppError(
      "Gmail-Import ist nicht konfiguriert. Bitte GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET und GMAIL_REFRESH_TOKEN als Umgebungsvariablen setzen.",
      503,
    );
  }
  return { clientId, clientSecret, refreshToken, label };
}

async function accessToken(): Promise<string> {
  const { clientId, clientSecret, refreshToken } = env();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new AppError("Gmail-Authentifizierung fehlgeschlagen (Refresh-Token prüfen).", 502);
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new AppError("Kein Gmail-Access-Token erhalten.", 502);
  return json.access_token;
}

function header(part: GmailPart | undefined, name: string): string {
  const h = part?.headers?.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? "";
}

/** Display-Name aus "Name <mail@x>" oder die Mail-Adresse. */
function senderName(from: string): string {
  const m = from.match(/^\s*"?([^"<]+?)"?\s*<.+>$/);
  if (m) return m[1].trim();
  return from.trim() || "Unbekannter Lieferant";
}

/** Rekursiv alle PDF-Anhänge (mit attachmentId) einsammeln. */
function collectPdfAttachments(part: GmailPart | undefined, out: { filename: string; attachmentId: string }[]) {
  if (!part) return;
  const isPdf =
    (part.filename && /\.pdf$/i.test(part.filename)) || part.mimeType === "application/pdf";
  if (isPdf && part.filename && part.body?.attachmentId) {
    out.push({ filename: part.filename, attachmentId: part.body.attachmentId });
  }
  part.parts?.forEach((p) => collectPdfAttachments(p, out));
}

export const gmailImportService = {
  async scan() {
    const { label } = env();
    const token = await accessToken();
    const authHeader = { Authorization: `Bearer ${token}` };

    const q = encodeURIComponent(`label:${label} is:unread has:attachment filename:pdf`);
    const listRes = await fetch(`${API}/messages?q=${q}&maxResults=25`, { headers: authHeader });
    if (!listRes.ok) throw new AppError("Gmail-Nachrichten konnten nicht gelesen werden.", 502);
    const list = (await listRes.json()) as { messages?: { id: string }[] };
    const messages = list.messages ?? [];

    let imported = 0;
    let skipped = 0;

    for (const { id } of messages) {
      if (await incomingInvoiceService.existsBySourceRef(id)) {
        skipped++;
        continue;
      }
      const msgRes = await fetch(`${API}/messages/${id}?format=full`, { headers: authHeader });
      if (!msgRes.ok) {
        skipped++;
        continue;
      }
      const msg = (await msgRes.json()) as GmailMessage;
      const from = header(msg.payload, "From");
      const dateHeader = header(msg.payload, "Date");
      const invoiceDate = dateHeader && !isNaN(Date.parse(dateHeader)) ? new Date(dateHeader) : new Date();

      const attachments: { filename: string; attachmentId: string }[] = [];
      collectPdfAttachments(msg.payload, attachments);
      if (attachments.length === 0) {
        skipped++;
        continue;
      }

      // Erster PDF-Anhang als Beleg (weitere Anhänge ignorieren wir bewusst).
      const att = attachments[0];
      const attRes = await fetch(`${API}/messages/${id}/attachments/${att.attachmentId}`, {
        headers: authHeader,
      });
      if (!attRes.ok) {
        skipped++;
        continue;
      }
      const attJson = (await attRes.json()) as { data?: string };
      if (!attJson.data) {
        skipped++;
        continue;
      }
      const buffer = Buffer.from(attJson.data, "base64url");
      const safeName = att.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put(`incoming-invoices/gmail-${id}-${safeName}`, buffer, {
        access: "public",
        contentType: "application/pdf",
      });

      await incomingInvoiceService.create(
        {
          supplierName: senderName(from),
          invoiceNo: undefined,
          invoiceDate,
          amountNet: undefined,
          amountGross: undefined,
          taxAmount: undefined,
          status: "OPEN",
        },
        blob.url,
        "EMAIL",
        id,
      );
      imported++;

      // Als gelesen markieren -> wird beim nächsten Scan nicht erneut gefunden.
      await fetch(`${API}/messages/${id}/modify`, {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
      });
    }

    return { scanned: messages.length, imported, skipped };
  },
};
