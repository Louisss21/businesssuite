import { prisma } from "@/lib/db";
import { AppError } from "@/lib/http";
import { sendEmail } from "@/lib/email";
import { settingsService } from "@/modules/settings/settings.service";
import { generateInvoicePdf, generateQuotePdf, generateOrderPdf } from "./pdf-render";
import type { OrderPdfType } from "@/modules/orders/order-pdf";

export type DocKind = "invoice" | "quote" | "order";

/**
 * Punkt 7: erzeugt das passende PDF, hängt es an eine E-Mail (zentrale
 * sendEmail) und protokolliert den Versand am Beleg. Quellenunabhängig.
 */
export async function sendDocument(opts: {
  kind: DocKind;
  id: string;
  to: string;
  type?: OrderPdfType;
}) {
  const { kind, id, to } = opts;
  if (!to || !to.includes("@")) throw new AppError("Gültige Empfängeradresse erforderlich.", 422);

  const pdf =
    kind === "invoice"
      ? await generateInvoicePdf(id)
      : kind === "quote"
        ? await generateQuotePdf(id)
        : await generateOrderPdf(id, opts.type ?? "confirmation");

  const settings = await settingsService.get();
  const subject = `${pdf.docLabel} ${pdf.number}${settings.companyName ? ` – ${settings.companyName}` : ""}`;
  const text = [
    "Guten Tag,",
    "",
    `anbei erhalten Sie ${pdf.docLabel} ${pdf.number} als PDF.`,
    "",
    settings.invoiceFooter || "Vielen Dank für Ihren Auftrag.",
    "",
    settings.companyName,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const result = await sendEmail({
    to,
    subject,
    text,
    attachments: [
      { filename: pdf.filename, content: pdf.buffer.toString("base64"), contentType: "application/pdf" },
    ],
  });

  if (!result.ok) {
    throw new AppError(
      result.skipped
        ? "E-Mail-Versand nicht konfiguriert (RESEND_API_KEY fehlt)."
        : result.error || "Versand fehlgeschlagen.",
      result.skipped ? 503 : 502,
    );
  }

  const now = new Date();
  if (kind === "invoice") {
    await prisma.invoice.update({ where: { id }, data: { lastSentAt: now } });
  } else if (kind === "quote") {
    await prisma.quote.update({ where: { id }, data: { lastSentAt: now } });
  } else {
    await prisma.order.update({
      where: { id },
      data: { lastDocSentAt: now, lastDocSentType: pdf.docLabel },
    });
  }

  return { sent: true, to, docLabel: pdf.docLabel, number: pdf.number };
}
