import Anthropic from "@anthropic-ai/sdk";

/**
 * TEMPORÄR (Diagnose, wird entfernt): prüft nur, ob der Anthropic-Key + Modell
 * funktionieren. Kein Zugriff auf Systemdaten, keine Werkzeuge.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const key =
    process.env.ANTHROPIC_API_KEY ||
    (process.env.OPENAI_API_KEY?.startsWith("sk-ant") ? process.env.OPENAI_API_KEY : undefined);
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  if (!key) {
    return Response.json({ ok: false, error: "Kein Anthropic-Key gesetzt" }, { status: 503 });
  }
  const client = new Anthropic({ apiKey: key });
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 32,
      messages: [{ role: "user", content: "Antworte nur mit: OK" }],
    });
    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return Response.json({ ok: true, model, reply });
  } catch (e) {
    const status = e instanceof Anthropic.APIError ? e.status : undefined;
    return Response.json(
      { ok: false, model, status, error: e instanceof Error ? e.message : "Netzwerkfehler" },
      { status: 502 },
    );
  }
}
