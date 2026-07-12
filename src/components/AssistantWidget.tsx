"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Msg {
  role: "user" | "assistant";
  content: string;
}
interface Pending {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

/**
 * System-Assistent: Chat-Panel, das Änderungen über RBAC-geprüfte Werkzeuge
 * ausführt. Riskante Aktionen erfordern eine Bestätigung im Chat.
 */
export function AssistantWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, pending, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    setPending(null);
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next.slice(-20) }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsgs((m) => [...m, { role: "assistant", content: j.error ?? "Fehler bei der Anfrage." }]);
      return;
    }
    const d = j.data ?? {};
    if (d.reply) setMsgs((m) => [...m, { role: "assistant", content: d.reply as string }]);
    if (d.pending) setPending(d.pending as Pending);
  }

  async function confirmPending(yes: boolean) {
    if (!pending) return;
    if (!yes) {
      setMsgs((m) => [...m, { role: "assistant", content: "Okay, Aktion verworfen." }]);
      setPending(null);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/assistant/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: pending.tool, args: pending.args }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setPending(null);
    const text = res.ok ? (j.data?.result as string) : (j.error ?? "Aktion fehlgeschlagen.");
    setMsgs((m) => [...m, { role: "assistant", content: text }]);
    if (res.ok) router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        title="System-Assistent"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-xl text-white shadow-lg transition hover:bg-brand-700"
      >
        {open ? "✕" : "✦"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-40 flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">System-Assistent</div>
            <div className="text-xs text-slate-400">
              Fragen & Änderungen per Chat – riskante Aktionen mit Bestätigung.
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {msgs.length === 0 && (
              <p className="text-xs text-slate-400">
                z. B.: „Welche Bauteile sind unter Mindestbestand?" · „Lege eine Aufgabe an:
                Lieferant anrufen, morgen" · „Setze Bestellung ORD-2026-0003 auf COMPLETED"
              </p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="rounded-lg border border-amber-600/40 bg-amber-50 p-3 text-sm">
                <div className="font-medium text-amber-700">Bestätigung erforderlich</div>
                <div className="mt-1 text-slate-700">{pending.summary}</div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => confirmPending(true)}
                    disabled={busy}
                    className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    Ausführen
                  </button>
                  <button
                    onClick={() => confirmPending(false)}
                    disabled={busy}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
            {busy && <p className="text-xs text-slate-400">denkt nach…</p>}
            <div ref={endRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Nachricht…"
              disabled={busy}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
