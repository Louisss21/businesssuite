import { prisma } from "@/lib/db";
import { AppError } from "@/lib/http";
import { accessFor, type ModuleKey } from "@/lib/permissions";
import type { Role } from "@/lib/auth";
import { componentService } from "@/modules/inventory/component.service";
import { taskService } from "@/modules/tasks/task.service";
import { leadService } from "@/modules/crm/lead.service";
import { orderService } from "@/modules/orders/order.service";
import { invoiceService } from "@/modules/invoices/invoice.service";

/**
 * System-Assistent (Chatbot): führt Änderungen über die BESTEHENDEN
 * Service-Funktionen aus (Validierung, Transaktionen, Schutzregeln greifen
 * automatisch). Rechte: pro Werkzeug gegen die RBAC-Matrix der Nutzerrolle.
 * Riskante Aktionen werden nicht sofort ausgeführt, sondern als
 * Bestätigungs-Vorschlag an das UI zurückgegeben.
 *
 * Modell: OpenAI via REST (OPENAI_API_KEY, OPENAI_MODEL – Standard "gpt-5.1").
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PendingAction {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

export interface AssistantResult {
  reply?: string;
  pending?: PendingAction;
}

interface Ctx {
  userId: string;
  role: Role;
}

interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  module: ModuleKey;
  write: boolean;
  risky: boolean;
  summarize: (args: Record<string, unknown>) => string;
  execute: (args: Record<string, unknown>, ctx: Ctx) => Promise<string>;
}

const str = (v: unknown): string => (typeof v === "string" ? v : String(v ?? ""));
const num = (v: unknown): number => Number(v ?? 0);

async function findComponent(query: string) {
  const q = query.trim();
  const hits = await prisma.component.findMany({
    where: {
      active: true,
      OR: [
        { sku: { equals: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 5,
  });
  return hits;
}

const TOOLS: ToolDef[] = [
  {
    name: "get_low_stock",
    description: "Listet alle Bauteile, die auf oder unter dem Mindestbestand liegen.",
    parameters: { type: "object", properties: {}, required: [] },
    module: "inventory",
    write: false,
    risky: false,
    summarize: () => "Bauteile unter Mindestbestand abfragen",
    execute: async () => {
      const low = await componentService.list({ underMin: true });
      if (low.length === 0) return "Kein Bauteil unter Mindestbestand.";
      return low.map((c) => `${c.name} (${c.sku}): ${c.stockQty}/${c.minStock} ${c.unit}`).join("\n");
    },
  },
  {
    name: "find_component",
    description: "Sucht Bauteile im Lager nach Name oder SKU und zeigt Bestand/Mindestbestand.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Name oder SKU" } },
      required: ["query"],
    },
    module: "inventory",
    write: false,
    risky: false,
    summarize: (a) => `Bauteil suchen: ${str(a.query)}`,
    execute: async (a) => {
      const hits = await findComponent(str(a.query));
      if (hits.length === 0) return `Kein Bauteil zu "${str(a.query)}" gefunden.`;
      return hits.map((c) => `${c.name} (${c.sku}): Bestand ${c.stockQty}, Mindestbestand ${c.minStock} ${c.unit}`).join("\n");
    },
  },
  {
    name: "list_orders",
    description: "Listet Bestellungen, optional nach Status (DRAFT, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED).",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] } },
      required: [],
    },
    module: "orders",
    write: false,
    risky: false,
    summarize: (a) => `Bestellungen listen${a.status ? ` (${str(a.status)})` : ""}`,
    execute: async (a) => {
      const orders = await orderService.list({ status: a.status ? str(a.status) : undefined });
      if (orders.length === 0) return "Keine Bestellungen gefunden.";
      return orders
        .slice(0, 15)
        .map((o) => `${o.orderNumber} · ${o.status} · ${Number(o.grossTotal).toFixed(2)} €`)
        .join("\n");
    },
  },
  {
    name: "create_task",
    description: "Legt eine neue Aufgabe an (Titel, optional Fälligkeitsdatum YYYY-MM-DD und Priorität LOW/MEDIUM/HIGH/URGENT).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        dueDate: { type: "string", description: "YYYY-MM-DD, optional" },
        priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      },
      required: ["title"],
    },
    module: "tasks",
    write: true,
    risky: false,
    summarize: (a) => `Aufgabe anlegen: "${str(a.title)}"`,
    execute: async (a, ctx) => {
      await taskService.create({
        title: str(a.title),
        dueAt: a.dueDate ? str(a.dueDate) : undefined,
        priority: a.priority ? str(a.priority) : "MEDIUM",
        assignedToId: ctx.userId,
      });
      return `Aufgabe "${str(a.title)}" angelegt${a.dueDate ? `, fällig ${str(a.dueDate)}` : ""}.`;
    },
  },
  {
    name: "update_lead_status",
    description: "Setzt den Status eines Leads (NEW, CONTACTED, QUALIFIED, WON, LOST). Lead per Titel/E-Mail suchen.",
    parameters: {
      type: "object",
      properties: {
        leadQuery: { type: "string", description: "Titel oder E-Mail des Leads" },
        status: { type: "string", enum: ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] },
      },
      required: ["leadQuery", "status"],
    },
    module: "leads",
    write: true,
    risky: false,
    summarize: (a) => `Lead "${str(a.leadQuery)}" auf ${str(a.status)} setzen`,
    execute: async (a) => {
      const q = str(a.leadQuery).trim();
      const hits = await prisma.lead.findMany({
        where: { OR: [{ title: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] },
        take: 3,
      });
      if (hits.length === 0) return `Kein Lead zu "${q}" gefunden.`;
      if (hits.length > 1) return `Mehrere Leads gefunden (${hits.map((l) => l.title).join(", ")}) – bitte genauer angeben.`;
      await leadService.update(hits[0].id, { status: str(a.status) });
      return `Lead "${hits[0].title}" auf ${str(a.status)} gesetzt.`;
    },
  },
  {
    name: "update_order_status",
    description: "Setzt den Status einer Bestellung anhand der Bestellnummer (z. B. ORD-2026-0001).",
    parameters: {
      type: "object",
      properties: {
        orderNumber: { type: "string" },
        status: { type: "string", enum: ["DRAFT", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
      },
      required: ["orderNumber", "status"],
    },
    module: "orders",
    write: true,
    risky: false,
    summarize: (a) => `Bestellung ${str(a.orderNumber)} auf ${str(a.status)} setzen`,
    execute: async (a) => {
      const o = await prisma.order.findUnique({ where: { orderNumber: str(a.orderNumber).trim() } });
      if (!o) return `Bestellung ${str(a.orderNumber)} nicht gefunden.`;
      await orderService.update(o.id, { status: str(a.status) });
      return `Bestellung ${o.orderNumber} auf ${str(a.status)} gesetzt.`;
    },
  },
  {
    name: "set_min_stock",
    description: "RISKANT: Setzt den Mindestbestand eines Bauteils (Name oder SKU).",
    parameters: {
      type: "object",
      properties: {
        component: { type: "string", description: "Name oder SKU" },
        minStock: { type: "number" },
      },
      required: ["component", "minStock"],
    },
    module: "inventory",
    write: true,
    risky: true,
    summarize: (a) => `Mindestbestand von "${str(a.component)}" auf ${num(a.minStock)} setzen`,
    execute: async (a) => {
      const hits = await findComponent(str(a.component));
      if (hits.length === 0) return `Kein Bauteil zu "${str(a.component)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Bauteile gefunden (${hits.map((c) => c.sku).join(", ")}) – bitte SKU angeben.`;
      await componentService.update(hits[0].id, { minStock: num(a.minStock) });
      return `Mindestbestand von ${hits[0].name} (${hits[0].sku}) auf ${num(a.minStock)} gesetzt.`;
    },
  },
  {
    name: "adjust_stock",
    description: "RISKANT: Bucht Bestand eines Bauteils (delta > 0 Zugang, < 0 Abgang) mit Grund.",
    parameters: {
      type: "object",
      properties: {
        component: { type: "string", description: "Name oder SKU" },
        delta: { type: "number" },
        reason: { type: "string" },
      },
      required: ["component", "delta", "reason"],
    },
    module: "inventory",
    write: true,
    risky: true,
    summarize: (a) => `Bestand von "${str(a.component)}" um ${num(a.delta)} buchen (${str(a.reason)})`,
    execute: async (a) => {
      const hits = await findComponent(str(a.component));
      if (hits.length === 0) return `Kein Bauteil zu "${str(a.component)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Bauteile gefunden (${hits.map((c) => c.sku).join(", ")}) – bitte SKU angeben.`;
      const updated = await componentService.adjustStock(hits[0].id, { delta: num(a.delta), reason: str(a.reason) });
      return `Bestand von ${hits[0].name} (${hits[0].sku}) angepasst – neuer Bestand: ${updated.stockQty}.`;
    },
  },
  {
    name: "update_invoice_status",
    description: "RISKANT: Setzt den Status einer Rechnung (OPEN, PAID, OVERDUE, CANCELLED) anhand der Rechnungsnummer.",
    parameters: {
      type: "object",
      properties: {
        invoiceNumber: { type: "string" },
        status: { type: "string", enum: ["OPEN", "PAID", "OVERDUE", "CANCELLED"] },
      },
      required: ["invoiceNumber", "status"],
    },
    module: "invoices",
    write: true,
    risky: true,
    summarize: (a) => `Rechnung ${str(a.invoiceNumber)} auf ${str(a.status)} setzen`,
    execute: async (a) => {
      const inv = await prisma.invoice.findUnique({ where: { invoiceNumber: str(a.invoiceNumber).trim() } });
      if (!inv) return `Rechnung ${str(a.invoiceNumber)} nicht gefunden.`;
      await invoiceService.update(inv.id, { status: str(a.status) });
      return `Rechnung ${inv.invoiceNumber} auf ${str(a.status)} gesetzt.`;
    },
  },
];

function allowed(tool: ToolDef, role: Role): boolean {
  const acc = accessFor(role, tool.module);
  if (acc === "none") return false;
  return tool.write ? acc === "write" : true;
}

async function logAction(ctx: Ctx, tool: string, args: Record<string, unknown>, result: string) {
  await prisma.assistantLog.create({
    data: { userId: ctx.userId, userRole: ctx.role, tool, args: args as never, result: result.slice(0, 1000) },
  });
}

/** Bestätigte riskante Aktion ausführen (RBAC erneut geprüft). */
export async function executeConfirmed(tool: string, args: Record<string, unknown>, ctx: Ctx): Promise<string> {
  const def = TOOLS.find((t) => t.name === tool);
  if (!def || !def.risky) throw new AppError("Unbekannte oder nicht bestätigungspflichtige Aktion.", 422);
  if (!allowed(def, ctx.role)) throw new AppError("Deine Rolle darf diese Aktion nicht ausführen.", 403);
  const result = await def.execute(args, ctx);
  await logAction(ctx, tool, args, result);
  return result;
}

// ---- OpenAI-Aufruf (REST, Function Calling) ----

interface OaToolCall {
  id: string;
  function: { name: string; arguments: string };
}
interface OaMessage {
  role: string;
  content: string | null;
  tool_calls?: OaToolCall[];
}
interface OaResponse {
  choices?: { message: OaMessage }[];
  error?: { message?: string };
}

const SYSTEM_PROMPT = [
  "Du bist der System-Assistent der Sustable BusinessSuite (CRM/ERP, Tischfertigung).",
  "Antworte kurz, präzise und auf Deutsch. Nutze die verfügbaren Werkzeuge, um Daten",
  "abzufragen oder Änderungen auszuführen. Wenn Angaben fehlen (z. B. welche Bestellung),",
  "frage nach statt zu raten. Erfinde keine Daten.",
].join(" ");

export async function chat(messages: ChatMessage[], ctx: Ctx): Promise<AssistantResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new AppError(
      "Assistent nicht konfiguriert: Bitte OPENAI_API_KEY (und optional OPENAI_MODEL) als Umgebungsvariable setzen.",
      503,
    );
  }
  const model = process.env.OPENAI_MODEL || "gpt-5.1";

  const available = TOOLS.filter((t) => allowed(t, ctx.role));
  const oaTools = available.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const convo: Record<string, unknown>[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let round = 0; round < 5; round++) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: convo, tools: oaTools, tool_choice: "auto" }),
    });
    const json = (await res.json()) as OaResponse;
    if (!res.ok) {
      throw new AppError(`KI-Anfrage fehlgeschlagen: ${json.error?.message ?? res.status}`, 502);
    }
    const msg = json.choices?.[0]?.message;
    if (!msg) throw new AppError("Keine Antwort vom Modell erhalten.", 502);

    const calls = msg.tool_calls ?? [];
    if (calls.length === 0) {
      return { reply: msg.content ?? "(keine Antwort)" };
    }

    convo.push({ role: "assistant", content: msg.content, tool_calls: msg.tool_calls });

    for (const call of calls) {
      const def = TOOLS.find((t) => t.name === call.function.name);
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
      } catch {
        // leere Argumente
      }

      if (!def) {
        convo.push({ role: "tool", tool_call_id: call.id, content: "Unbekanntes Werkzeug." });
        continue;
      }
      if (!allowed(def, ctx.role)) {
        convo.push({ role: "tool", tool_call_id: call.id, content: "Keine Berechtigung für diese Aktion (Rolle)." });
        continue;
      }
      if (def.risky) {
        // Riskante Aktion: nicht ausführen, sondern Bestätigung anfordern.
        return {
          reply: msg.content ?? undefined,
          pending: { tool: def.name, args, summary: def.summarize(args) },
        };
      }
      let result: string;
      try {
        result = await def.execute(args, ctx);
      } catch (e) {
        result = `Fehler: ${e instanceof Error ? e.message : "Aktion fehlgeschlagen"}`;
      }
      await logAction(ctx, def.name, args, result);
      convo.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }

  return { reply: "Zu viele Zwischenschritte – bitte die Anfrage präziser formulieren." };
}
