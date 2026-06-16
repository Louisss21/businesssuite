import { createElement } from "react";
import { renderToBuffer, Document, Page, Text } from "@react-pdf/renderer";

// TEMPORÄR: isolierter @react-pdf-Renderer ohne Auth/DB zur Diagnose des 503.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const doc = createElement(
      Document,
      null,
      createElement(Page, { size: "A4" }, createElement(Text, null, "PDF-Test OK")),
    ) as unknown as Parameters<typeof renderToBuffer>[0];
    const buffer = await renderToBuffer(doc);
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "application/pdf" },
    });
  } catch (e) {
    console.error("[debug/pdf-test] render failed:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
