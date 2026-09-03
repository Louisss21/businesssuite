/**
 * TEMPORÄR (Diagnose, wird entfernt): prüft nur, ob OPENAI_API_KEY + Modell
 * funktionieren. Kein Zugriff auf Systemdaten, keine Werkzeuge.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.1";
  if (!key) {
    return Response.json({ ok: false, error: "OPENAI_API_KEY nicht gesetzt" }, { status: 503 });
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Antworte nur mit: OK" }],
      }),
    });
    const json = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
      error?: { message?: string };
    };
    if (!res.ok) {
      return Response.json(
        { ok: false, model, status: res.status, error: json.error?.message ?? "unbekannt" },
        { status: 502 },
      );
    }
    return Response.json({ ok: true, model, reply: json.choices?.[0]?.message?.content ?? null });
  } catch (e) {
    return Response.json(
      { ok: false, model, error: e instanceof Error ? e.message : "Netzwerkfehler" },
      { status: 502 },
    );
  }
}
