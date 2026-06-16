/**
 * Lädt das Firmenlogo für die PDF-Einbettung.
 *
 * @react-pdf/renderer kann nur Raster-Bilder (PNG/JPG) einbetten – kein SVG.
 * Wir holen das Bild serverseitig und liefern einen Data-URI. Schlägt etwas
 * fehl (kein Logo, SVG, Netzwerkfehler), wird `undefined` zurückgegeben und das
 * PDF rendert ohne Logo (sauberer Fallback statt Render-Absturz).
 */
export async function loadLogoDataUri(logoUrl?: string | null): Promise<string | undefined> {
  if (!logoUrl) return undefined;
  const lower = logoUrl.toLowerCase();
  if (lower.endsWith(".svg") || lower.includes("image/svg")) return undefined;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return undefined;
    const contentType = res.headers.get("content-type") ?? "";
    if (!/png|jpe?g/i.test(contentType) && !/\.(png|jpe?g)$/i.test(lower)) {
      return undefined;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = /png/i.test(contentType) || lower.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}
