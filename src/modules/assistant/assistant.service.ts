import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/http";
import { accessFor, type ModuleKey } from "@/lib/permissions";
import type { Role } from "@/lib/auth";
import { componentService } from "@/modules/inventory/component.service";
import { taskService } from "@/modules/tasks/task.service";
import { leadService } from "@/modules/crm/lead.service";
import { orderService } from "@/modules/orders/order.service";
import { invoiceService } from "@/modules/invoices/invoice.service";
import { quoteService } from "@/modules/quotes/quote.service";
import { productService } from "@/modules/products/product.service";
import { productionService } from "@/modules/production/production.service";
import { customerService, displayName } from "@/modules/crm/customer.service";
import { customerCreateSchema } from "@/modules/crm/customer.schema";
import { userService } from "@/modules/users/user.service";
import { activityService } from "@/modules/activities/activity.service";
import { ACTIVITY_LABELS } from "@/modules/activities/activity.schema";

/**
 * System-Assistent (Chatbot): führt Änderungen über die BESTEHENDEN
 * Service-Funktionen aus (Validierung, Transaktionen, Schutzregeln greifen
 * automatisch). Rechte: pro Werkzeug gegen die RBAC-Matrix der Nutzerrolle.
 * Riskante Aktionen werden nicht sofort ausgeführt, sondern als
 * Bestätigungs-Vorschlag an das UI zurückgegeben.
 *
 * Modell: Anthropic Claude via offizielles SDK. Key aus ANTHROPIC_API_KEY
 * (Fallback: OPENAI_API_KEY, falls dort ein sk-ant-Key liegt),
 * Modell aus ANTHROPIC_MODEL – Standard "claude-opus-4-8".
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

async function findLeads(query: string) {
  const q = query.trim();
  return prisma.lead.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 5,
  });
}

/** Aktiven Nutzer per Name oder E-Mail auflösen (eindeutig, sonst Fehlertext). */
async function findUser(name: string): Promise<{ id: string; name: string } | string> {
  const q = name.trim();
  const hits = await prisma.user.findMany({
    where: {
      active: true,
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
    take: 3,
  });
  if (hits.length === 0) return `Kein aktiver Mitarbeiter zu "${q}" gefunden.`;
  if (hits.length > 1) return `Mehrere Mitarbeiter gefunden (${hits.map((u) => u.name).join(", ")}) – bitte genauer angeben.`;
  return hits[0];
}

const fmtDate = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("de-DE") : "—";
const fmtEur = (n: number) => `${Number(n).toFixed(2)} €`;

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

  // ---- Nutzer ----
  {
    name: "list_users",
    description: "Listet alle Mitarbeiter (Name, Rolle, aktiv/inaktiv) – z. B. um Zuständigkeiten zu vergeben.",
    parameters: { type: "object", properties: {}, required: [] },
    module: "dashboard",
    write: false,
    risky: false,
    summarize: () => "Mitarbeiter auflisten",
    execute: async () => {
      const users = await userService.list();
      return users
        .map((u) => `${u.name} · ${u.role}${u.active ? "" : " · inaktiv"}`)
        .join("\n");
    },
  },

  // ---- Leads ----
  {
    name: "list_leads",
    description:
      "Listet Leads, optional nach Status (NEW, CONTACTED, QUALIFIED, WON, LOST) und/oder zuständigem Mitarbeiter (Name).",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] },
        assignedTo: { type: "string", description: "Name des zuständigen Mitarbeiters (optional)" },
      },
      required: [],
    },
    module: "leads",
    write: false,
    risky: false,
    summarize: (a) => `Leads listen${a.status ? ` (${str(a.status)})` : ""}`,
    execute: async (a) => {
      let assignedUserId: string | undefined;
      if (a.assignedTo) {
        const u = await findUser(str(a.assignedTo));
        if (typeof u === "string") return u;
        assignedUserId = u.id;
      }
      const leads = await prisma.lead.findMany({
        where: { status: a.status ? (str(a.status) as never) : undefined, assignedUserId },
        orderBy: { updatedAt: "desc" },
        take: 30,
      });
      if (leads.length === 0) return "Keine Leads gefunden.";
      const users = await prisma.user.findMany({ select: { id: true, name: true } });
      const names = new Map(users.map((u) => [u.id, u.name]));
      return leads
        .map(
          (l) =>
            `${l.title} · ${l.status} · Score ${l.score} · Zuständig: ${
              l.assignedUserId ? (names.get(l.assignedUserId) ?? "Unbekannt") : "—"
            }`,
        )
        .join("\n");
    },
  },
  {
    name: "create_lead",
    description: "Legt einen neuen Lead an (Titel; optional Kontakt- und Firmendaten, Quelle).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        company: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        source: { type: "string" },
      },
      required: ["title"],
    },
    module: "leads",
    write: true,
    risky: false,
    summarize: (a) => `Lead anlegen: "${str(a.title)}"`,
    execute: async (a) => {
      const lead = await leadService.create({
        title: str(a.title),
        firstName: a.firstName ? str(a.firstName) : "",
        lastName: a.lastName ? str(a.lastName) : "",
        company: a.company ? str(a.company) : "",
        email: a.email ? str(a.email) : "",
        phone: a.phone ? str(a.phone) : "",
        source: a.source ? str(a.source) : "",
      });
      return `Lead "${lead.title}" angelegt.`;
    },
  },
  {
    name: "assign_lead",
    description:
      "Setzt den zuständigen Mitarbeiter eines Leads. Lead per Titel/E-Mail/Firma, Mitarbeiter per Name. Leerer Name entfernt die Zuweisung.",
    parameters: {
      type: "object",
      properties: {
        leadQuery: { type: "string", description: "Titel, E-Mail oder Firma des Leads" },
        userName: { type: "string", description: "Name des Mitarbeiters; leer = Zuweisung entfernen" },
      },
      required: ["leadQuery"],
    },
    module: "leads",
    write: true,
    risky: false,
    summarize: (a) =>
      a.userName
        ? `Lead "${str(a.leadQuery)}" an ${str(a.userName)} zuweisen`
        : `Zuweisung von Lead "${str(a.leadQuery)}" entfernen`,
    execute: async (a) => {
      const hits = await findLeads(str(a.leadQuery));
      if (hits.length === 0) return `Kein Lead zu "${str(a.leadQuery)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Leads gefunden (${hits.map((l) => l.title).join(", ")}) – bitte genauer angeben.`;
      if (!a.userName || !str(a.userName).trim()) {
        await leadService.update(hits[0].id, { assignedUserId: "" });
        return `Zuweisung von Lead "${hits[0].title}" entfernt.`;
      }
      const u = await findUser(str(a.userName));
      if (typeof u === "string") return u;
      await leadService.update(hits[0].id, { assignedUserId: u.id });
      return `Lead "${hits[0].title}" ist jetzt ${u.name} zugewiesen.`;
    },
  },
  {
    name: "update_lead",
    description:
      "Ändert Lead-Daten: Notiz, Titel, Kontaktdaten, Firma, Position, Quelle oder Score. Lead per Titel/E-Mail/Firma suchen. Nur angegebene Felder werden geändert; die Notiz wird dabei ersetzt (für fortlaufende Einträge add_lead_activity nutzen).",
    parameters: {
      type: "object",
      properties: {
        leadQuery: { type: "string", description: "Titel, E-Mail oder Firma des Leads" },
        notes: { type: "string", description: "Notiz zum Lead (ersetzt die bisherige Notiz)" },
        title: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        company: { type: "string" },
        position: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        source: { type: "string" },
        score: { type: "number", description: "0 bis 100" },
      },
      required: ["leadQuery"],
    },
    module: "leads",
    write: true,
    risky: false,
    summarize: (a) => `Lead "${str(a.leadQuery)}" aktualisieren`,
    execute: async (a) => {
      const hits = await findLeads(str(a.leadQuery));
      if (hits.length === 0) return `Kein Lead zu "${str(a.leadQuery)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Leads gefunden (${hits.map((l) => l.title).join(", ")}) – bitte genauer angeben.`;
      const changes: Record<string, unknown> = {};
      const textFields = [
        "notes",
        "title",
        "firstName",
        "lastName",
        "company",
        "position",
        "email",
        "phone",
        "source",
      ] as const;
      for (const f of textFields) {
        if (a[f] !== undefined) changes[f] = str(a[f]);
      }
      if (a.score !== undefined) changes.score = num(a.score);
      if (Object.keys(changes).length === 0) return "Keine Änderungen angegeben.";
      await leadService.update(hits[0].id, changes);
      return `Lead "${hits[0].title}" aktualisiert (${Object.keys(changes).join(", ")}).`;
    },
  },
  {
    name: "add_lead_activity",
    description:
      "Hält eine Aktivität beim Lead fest (NOTE Notiz, CALL Anruf, EMAIL, MEETING, VISIT Besuch). Erscheint im Verlauf des Leads – der richtige Weg für fortlaufende Gesprächsnotizen.",
    parameters: {
      type: "object",
      properties: {
        leadQuery: { type: "string", description: "Titel, E-Mail oder Firma des Leads" },
        type: { type: "string", enum: ["NOTE", "CALL", "EMAIL", "MEETING", "VISIT"] },
        subject: { type: "string", description: "Kurzer Betreff" },
        body: { type: "string", description: "Ausführlicher Text (optional)" },
      },
      required: ["leadQuery", "subject"],
    },
    module: "leads",
    write: true,
    risky: false,
    summarize: (a) =>
      `${ACTIVITY_LABELS[str(a.type) || "NOTE"] ?? "Notiz"} bei Lead "${str(a.leadQuery)}" festhalten`,
    execute: async (a) => {
      const hits = await findLeads(str(a.leadQuery));
      if (hits.length === 0) return `Kein Lead zu "${str(a.leadQuery)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Leads gefunden (${hits.map((l) => l.title).join(", ")}) – bitte genauer angeben.`;
      const type = a.type ? str(a.type) : "NOTE";
      await activityService.create({
        type,
        subject: str(a.subject),
        body: a.body ? str(a.body) : "",
        leadId: hits[0].id,
      });
      return `${ACTIVITY_LABELS[type] ?? "Notiz"} bei Lead "${hits[0].title}" festgehalten: ${str(a.subject)}`;
    },
  },
  {
    name: "list_lead_activities",
    description: "Zeigt den Verlauf eines Leads (Notizen, Anrufe, E-Mails, Meetings, Besuche).",
    parameters: {
      type: "object",
      properties: { leadQuery: { type: "string" } },
      required: ["leadQuery"],
    },
    module: "leads",
    write: false,
    risky: false,
    summarize: (a) => `Verlauf von Lead "${str(a.leadQuery)}" anzeigen`,
    execute: async (a) => {
      const hits = await findLeads(str(a.leadQuery));
      if (hits.length === 0) return `Kein Lead zu "${str(a.leadQuery)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Leads gefunden (${hits.map((l) => l.title).join(", ")}) – bitte genauer angeben.`;
      const acts = await activityService.list({ leadId: hits[0].id });
      const notes = hits[0].notes ? `Notiz: ${hits[0].notes}\n` : "";
      if (acts.length === 0) return `${notes}Noch keine Aktivitäten zu "${hits[0].title}".`;
      return (
        notes +
        acts
          .slice(0, 15)
          .map(
            (x) =>
              `${fmtDate(x.createdAt)} · ${ACTIVITY_LABELS[x.type] ?? x.type} · ${x.subject}${x.body ? ` – ${x.body}` : ""}`,
          )
          .join("\n")
      );
    },
  },
  {
    name: "distribute_leads",
    description:
      "RISKANT: Verteilt Leads gleichmäßig (Round-Robin) auf mehrere Mitarbeiter, optional gefiltert nach Status. Überschreibt bestehende Zuweisungen.",
    parameters: {
      type: "object",
      properties: {
        userNames: { type: "array", items: { type: "string" }, description: "Namen der Mitarbeiter" },
        status: { type: "string", enum: ["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"] },
      },
      required: ["userNames"],
    },
    module: "leads",
    write: true,
    risky: true,
    summarize: (a) =>
      `Leads${a.status ? ` (${str(a.status)})` : ""} gleichmäßig auf ${(Array.isArray(a.userNames) ? a.userNames : []).map(str).join(", ")} verteilen`,
    execute: async (a) => {
      const names = Array.isArray(a.userNames) ? a.userNames.map(str) : [];
      if (names.length === 0) return "Keine Mitarbeiter angegeben.";
      const users: { id: string; name: string }[] = [];
      for (const n of names) {
        const u = await findUser(n);
        if (typeof u === "string") return u;
        users.push(u);
      }
      const leads = await prisma.lead.findMany({
        where: { status: a.status ? (str(a.status) as never) : undefined },
        orderBy: { createdAt: "asc" },
      });
      if (leads.length === 0) return "Keine passenden Leads gefunden.";
      for (let i = 0; i < leads.length; i++) {
        await prisma.lead.update({
          where: { id: leads[i].id },
          data: { assignedUserId: users[i % users.length].id },
        });
      }
      const perUser = users
        .map((u, idx) => `${u.name}: ${leads.filter((_, i) => i % users.length === idx).length}`)
        .join(", ");
      return `${leads.length} Leads verteilt (${perUser}).`;
    },
  },

  // ---- Kunden (CRM) ----
  {
    name: "find_customer",
    description: "Sucht Kunden nach Name/Firma/E-Mail und zeigt Kontaktdaten und Einstufung.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    module: "crm",
    write: false,
    risky: false,
    summarize: (a) => `Kunde suchen: ${str(a.query)}`,
    execute: async (a) => {
      const hits = await customerService.list({ search: str(a.query) });
      if (hits.length === 0) return `Kein Kunde zu "${str(a.query)}" gefunden.`;
      return hits
        .slice(0, 5)
        .map((c) => `${displayName(c)} · ${c.email ?? "—"} · ${c.phone ?? "—"}${c.classification ? ` · ${c.classification}` : ""}`)
        .join("\n");
    },
  },
  {
    name: "create_customer",
    description:
      "Legt einen neuen Kunden an. type COMPANY braucht companyName, type PRIVATE braucht firstName+lastName.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["COMPANY", "PRIVATE"] },
        companyName: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        city: { type: "string" },
      },
      required: ["type"],
    },
    module: "crm",
    write: true,
    risky: false,
    summarize: (a) => `Kunde anlegen: ${str(a.companyName || `${a.firstName ?? ""} ${a.lastName ?? ""}`).trim()}`,
    execute: async (a) => {
      const input = customerCreateSchema.parse({
        type: str(a.type),
        companyName: a.companyName ? str(a.companyName) : undefined,
        firstName: a.firstName ? str(a.firstName) : undefined,
        lastName: a.lastName ? str(a.lastName) : undefined,
        email: a.email ? str(a.email) : "",
        phone: a.phone ? str(a.phone) : undefined,
        city: a.city ? str(a.city) : undefined,
      });
      const c = await customerService.create(input);
      return `Kunde "${displayName(c)}" angelegt.`;
    },
  },
  {
    name: "update_customer",
    description: "Aktualisiert Kontaktdaten/Notizen/Einstufung eines Kunden (per Name/Firma/E-Mail suchen).",
    parameters: {
      type: "object",
      properties: {
        customerQuery: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        notes: { type: "string" },
        classification: { type: "string", enum: ["A-Kunde", "B-Kunde", "C-Kunde", "VIP"] },
      },
      required: ["customerQuery"],
    },
    module: "crm",
    write: true,
    risky: false,
    summarize: (a) => `Kunde "${str(a.customerQuery)}" aktualisieren`,
    execute: async (a) => {
      const hits = await customerService.list({ search: str(a.customerQuery) });
      if (hits.length === 0) return `Kein Kunde zu "${str(a.customerQuery)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Kunden gefunden (${hits.slice(0, 5).map(displayName).join(", ")}) – bitte genauer angeben.`;
      const changes: Record<string, unknown> = {};
      if (a.email !== undefined) changes.email = str(a.email);
      if (a.phone !== undefined) changes.phone = str(a.phone);
      if (a.notes !== undefined) changes.notes = str(a.notes);
      if (a.classification !== undefined) changes.classification = str(a.classification);
      if (Object.keys(changes).length === 0) return "Keine Änderungen angegeben.";
      await customerService.update(hits[0].id, changes);
      return `Kunde "${displayName(hits[0])}" aktualisiert.`;
    },
  },

  {
    name: "add_customer_activity",
    description:
      "Hält eine Aktivität beim Kunden fest (NOTE Notiz, CALL Anruf, EMAIL, MEETING, VISIT Besuch) – erscheint im Kundenverlauf.",
    parameters: {
      type: "object",
      properties: {
        customerQuery: { type: "string", description: "Name, Firma oder E-Mail" },
        type: { type: "string", enum: ["NOTE", "CALL", "EMAIL", "MEETING", "VISIT"] },
        subject: { type: "string", description: "Kurzer Betreff" },
        body: { type: "string", description: "Ausführlicher Text (optional)" },
      },
      required: ["customerQuery", "subject"],
    },
    module: "crm",
    write: true,
    risky: false,
    summarize: (a) =>
      `${ACTIVITY_LABELS[str(a.type) || "NOTE"] ?? "Notiz"} bei Kunde "${str(a.customerQuery)}" festhalten`,
    execute: async (a) => {
      const hits = await customerService.list({ search: str(a.customerQuery) });
      if (hits.length === 0) return `Kein Kunde zu "${str(a.customerQuery)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Kunden gefunden (${hits.slice(0, 5).map(displayName).join(", ")}) – bitte genauer angeben.`;
      const type = a.type ? str(a.type) : "NOTE";
      await activityService.create({
        type,
        subject: str(a.subject),
        body: a.body ? str(a.body) : "",
        customerId: hits[0].id,
      });
      return `${ACTIVITY_LABELS[type] ?? "Notiz"} bei "${displayName(hits[0])}" festgehalten: ${str(a.subject)}`;
    },
  },

  // ---- Angebote ----
  {
    name: "list_quotes",
    description: "Listet Angebote, optional nach Status (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED).",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] } },
      required: [],
    },
    module: "quotes",
    write: false,
    risky: false,
    summarize: (a) => `Angebote listen${a.status ? ` (${str(a.status)})` : ""}`,
    execute: async (a) => {
      const quotes = await quoteService.list({ status: a.status ? str(a.status) : undefined });
      if (quotes.length === 0) return "Keine Angebote gefunden.";
      return quotes
        .slice(0, 15)
        .map((q) => `${q.number} · ${displayName(q.customer)} · ${q.status} · ${fmtEur(q.grossTotal)}`)
        .join("\n");
    },
  },
  {
    name: "update_quote_status",
    description: "Setzt den Status eines Angebots anhand der Angebotsnummer (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED).",
    parameters: {
      type: "object",
      properties: {
        quoteNumber: { type: "string" },
        status: { type: "string", enum: ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] },
      },
      required: ["quoteNumber", "status"],
    },
    module: "quotes",
    write: true,
    risky: false,
    summarize: (a) => `Angebot ${str(a.quoteNumber)} auf ${str(a.status)} setzen`,
    execute: async (a) => {
      const q = await prisma.quote.findUnique({ where: { number: str(a.quoteNumber).trim() } });
      if (!q) return `Angebot ${str(a.quoteNumber)} nicht gefunden.`;
      await quoteService.bulkUpdate([q.id], { status: str(a.status) });
      return `Angebot ${q.number} auf ${str(a.status)} gesetzt.`;
    },
  },
  {
    name: "convert_quote_to_order",
    description: "RISKANT: Wandelt ein Angebot in eine Bestellung um (per Angebotsnummer).",
    parameters: {
      type: "object",
      properties: { quoteNumber: { type: "string" } },
      required: ["quoteNumber"],
    },
    module: "quotes",
    write: true,
    risky: true,
    summarize: (a) => `Angebot ${str(a.quoteNumber)} in Bestellung umwandeln`,
    execute: async (a) => {
      const q = await prisma.quote.findUnique({ where: { number: str(a.quoteNumber).trim() } });
      if (!q) return `Angebot ${str(a.quoteNumber)} nicht gefunden.`;
      const order = await quoteService.convertToOrder(q.id);
      return `Angebot ${q.number} in Bestellung ${order.orderNumber} umgewandelt.`;
    },
  },

  // ---- Produkte ----
  {
    name: "find_product",
    description: "Sucht Produkte nach Name oder SKU und zeigt Preis, Bestand und Status.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    module: "products",
    write: false,
    risky: false,
    summarize: (a) => `Produkt suchen: ${str(a.query)}`,
    execute: async (a) => {
      const hits = await productService.list({ search: str(a.query) });
      if (hits.length === 0) return `Kein Produkt zu "${str(a.query)}" gefunden.`;
      return hits
        .slice(0, 5)
        .map((p) => `${p.name} (${p.sku}) · ${fmtEur(p.priceNet)} netto · Bestand ${p.stockQty}${p.active ? "" : " · inaktiv"}`)
        .join("\n");
    },
  },
  {
    name: "update_product_price",
    description: "RISKANT: Setzt den Netto-Preis eines Produkts (Name oder SKU).",
    parameters: {
      type: "object",
      properties: {
        product: { type: "string", description: "Name oder SKU" },
        priceNet: { type: "number" },
      },
      required: ["product", "priceNet"],
    },
    module: "products",
    write: true,
    risky: true,
    summarize: (a) => `Preis von "${str(a.product)}" auf ${num(a.priceNet).toFixed(2)} € netto setzen`,
    execute: async (a) => {
      const hits = await productService.list({ search: str(a.product) });
      if (hits.length === 0) return `Kein Produkt zu "${str(a.product)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Produkte gefunden (${hits.slice(0, 5).map((p) => p.sku).join(", ")}) – bitte SKU angeben.`;
      await productService.update(hits[0].id, { priceNet: num(a.priceNet) });
      return `Preis von ${hits[0].name} (${hits[0].sku}) auf ${fmtEur(num(a.priceNet))} netto gesetzt.`;
    },
  },

  // ---- Produktion ----
  {
    name: "list_production_orders",
    description: "Listet Produktionsaufträge, optional nach Status (IN_PROGRESS, COMPLETED, CANCELLED).",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["IN_PROGRESS", "COMPLETED", "CANCELLED"] } },
      required: [],
    },
    module: "production",
    write: false,
    risky: false,
    summarize: (a) => `Produktionsaufträge listen${a.status ? ` (${str(a.status)})` : ""}`,
    execute: async (a) => {
      const orders = await productionService.listOrders({ status: a.status ? str(a.status) : undefined });
      if (orders.length === 0) return "Keine Produktionsaufträge gefunden.";
      return orders
        .slice(0, 15)
        .map((o) => `${o.serialNumber ?? "(ohne Seriennummer)"} · ${o.tableModel.name} · ${o.status} · Schritt ${o.currentStep}`)
        .join("\n");
    },
  },
  {
    name: "complete_production_step",
    description: "RISKANT: Schließt den aktuellen Arbeitsschritt eines Produktionsauftrags ab (per Seriennummer); bucht ggf. Material.",
    parameters: {
      type: "object",
      properties: { serialNumber: { type: "string" } },
      required: ["serialNumber"],
    },
    module: "production",
    write: true,
    risky: true,
    summarize: (a) => `Aktuellen Schritt von Produktion ${str(a.serialNumber)} abschließen`,
    execute: async (a) => {
      const hits = await productionService.listOrders({ search: str(a.serialNumber).trim() });
      if (hits.length === 0) return `Kein Produktionsauftrag zu "${str(a.serialNumber)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Aufträge gefunden (${hits.map((o) => o.serialNumber).join(", ")}) – bitte genauer angeben.`;
      const result = await productionService.completeStep(hits[0].id);
      const lowStockNote =
        result.lowStock.length > 0 ? ` Achtung, unter Mindestbestand: ${result.lowStock.join(", ")}.` : "";
      return result.completed
        ? `Produktion ${hits[0].serialNumber} abgeschlossen.${lowStockNote}`
        : `Schritt ${hits[0].currentStep} erledigt – ${hits[0].serialNumber} steht jetzt auf Schritt ${hits[0].currentStep + 1}.${lowStockNote}`;
    },
  },

  // ---- Rechnungen ----
  {
    name: "list_invoices",
    description: "Listet Rechnungen, optional nach Status (OPEN, PAID, OVERDUE, CANCELLED).",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["OPEN", "PAID", "OVERDUE", "CANCELLED"] } },
      required: [],
    },
    module: "invoices",
    write: false,
    risky: false,
    summarize: (a) => `Rechnungen listen${a.status ? ` (${str(a.status)})` : ""}`,
    execute: async (a) => {
      const invoices = await invoiceService.list({ status: a.status ? str(a.status) : undefined });
      if (invoices.length === 0) return "Keine Rechnungen gefunden.";
      return invoices
        .slice(0, 15)
        .map((i) => `${i.invoiceNumber} · ${displayName(i.customer)} · ${i.status} · ${fmtEur(Number(i.grossTotal))} · fällig ${fmtDate(i.dueDate)}`)
        .join("\n");
    },
  },
  {
    name: "create_dunning",
    description: "RISKANT: Erstellt eine Mahnung zu einer überfälligen Rechnung (per Rechnungsnummer).",
    parameters: {
      type: "object",
      properties: { invoiceNumber: { type: "string" } },
      required: ["invoiceNumber"],
    },
    module: "invoices",
    write: true,
    risky: true,
    summarize: (a) => `Mahnung zu Rechnung ${str(a.invoiceNumber)} erstellen`,
    execute: async (a) => {
      const inv = await prisma.invoice.findUnique({ where: { invoiceNumber: str(a.invoiceNumber).trim() } });
      if (!inv) return `Rechnung ${str(a.invoiceNumber)} nicht gefunden.`;
      const dunning = await invoiceService.createDunning(inv.id);
      return `Mahnung (Stufe ${dunning.level}, Gebühr ${fmtEur(dunning.fee)}) zu Rechnung ${inv.invoiceNumber} erstellt.`;
    },
  },

  // ---- Aufgaben ----
  {
    name: "list_tasks",
    description: "Listet Aufgaben, optional nach Status (OPEN, IN_PROGRESS, DONE, CANCELLED).",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] } },
      required: [],
    },
    module: "tasks",
    write: false,
    risky: false,
    summarize: (a) => `Aufgaben listen${a.status ? ` (${str(a.status)})` : ""}`,
    execute: async (a) => {
      const tasks = await taskService.list({ status: a.status ? str(a.status) : undefined });
      if (tasks.length === 0) return "Keine Aufgaben gefunden.";
      return tasks
        .slice(0, 20)
        .map((t) => `${t.title} · ${t.status} · ${t.priority} · fällig ${fmtDate(t.dueAt)}`)
        .join("\n");
    },
  },
  {
    name: "complete_task",
    description: "Markiert eine Aufgabe als erledigt (Suche per Titel).",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Titel (oder Teil davon)" } },
      required: ["query"],
    },
    module: "tasks",
    write: true,
    risky: false,
    summarize: (a) => `Aufgabe "${str(a.query)}" als erledigt markieren`,
    execute: async (a) => {
      const hits = await prisma.task.findMany({
        where: {
          title: { contains: str(a.query).trim(), mode: "insensitive" },
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
        take: 3,
      });
      if (hits.length === 0) return `Keine offene Aufgabe zu "${str(a.query)}" gefunden.`;
      if (hits.length > 1) return `Mehrere Aufgaben gefunden (${hits.map((t) => t.title).join(", ")}) – bitte genauer angeben.`;
      await taskService.update(hits[0].id, { status: "DONE" });
      return `Aufgabe "${hits[0].title}" als erledigt markiert.`;
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

// ---- Anthropic-Aufruf (Messages API, Tool Use) ----

/** sk-ant-Key: bevorzugt ANTHROPIC_API_KEY, sonst OPENAI_API_KEY (falls dort ein Anthropic-Key liegt). */
function resolveAnthropicKey(): string | undefined {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const legacy = process.env.OPENAI_API_KEY;
  if (legacy && legacy.startsWith("sk-ant")) return legacy;
  return undefined;
}

const SYSTEM_PROMPT = [
  "Du bist der System-Assistent der Sustable BusinessSuite (CRM/ERP, Tischfertigung).",
  "Du arbeitest wie ein professioneller Assistent: Erledige Aufträge direkt über die",
  "verfügbaren Werkzeuge – Leads, Kunden, Angebote, Bestellungen, Produkte, Produktion,",
  "Lager, Rechnungen und Aufgaben kannst du abfragen und bearbeiten. Kombiniere Werkzeuge",
  "bei Bedarf (z. B. erst Mitarbeiter auflisten, dann Leads zuweisen). Antworte kurz,",
  "präzise und auf Deutsch. Wenn Angaben fehlen oder mehrdeutig sind, frage nach statt zu",
  "raten. Erfinde keine Daten. Als riskant markierte Aktionen erfordern eine Bestätigung",
  "durch den Nutzer – kündige sie entsprechend an.",
].join(" ");

export async function chat(messages: ChatMessage[], ctx: Ctx): Promise<AssistantResult> {
  const key = resolveAnthropicKey();
  if (!key) {
    throw new AppError(
      "Assistent nicht konfiguriert: Bitte ANTHROPIC_API_KEY (und optional ANTHROPIC_MODEL) als Umgebungsvariable setzen.",
      503,
    );
  }
  const model = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";
  const client = new Anthropic({ apiKey: key });

  const available = TOOLS.filter((t) => allowed(t, ctx.role));
  const tools: Anthropic.Tool[] = available.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters as Anthropic.Tool.InputSchema,
  }));

  const convo: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }));

  for (let round = 0; round < 8; round++) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages: convo,
      });
    } catch (e) {
      const msg = e instanceof Anthropic.APIError ? e.message : "Netzwerkfehler";
      throw new AppError(`KI-Anfrage fehlgeschlagen: ${msg}`, 502);
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const calls = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

    if (calls.length === 0) {
      return { reply: text || "(keine Antwort)" };
    }

    convo.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of calls) {
      const def = TOOLS.find((t) => t.name === call.name);
      const args = (call.input ?? {}) as Record<string, unknown>;

      if (!def) {
        results.push({ type: "tool_result", tool_use_id: call.id, content: "Unbekanntes Werkzeug." });
        continue;
      }
      if (!allowed(def, ctx.role)) {
        results.push({ type: "tool_result", tool_use_id: call.id, content: "Keine Berechtigung für diese Aktion (Rolle)." });
        continue;
      }
      if (def.risky) {
        // Riskante Aktion: nicht ausführen, sondern Bestätigung anfordern.
        return {
          reply: text || undefined,
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
      results.push({ type: "tool_result", tool_use_id: call.id, content: result });
    }
    convo.push({ role: "user", content: results });
  }

  return { reply: "Zu viele Zwischenschritte – bitte die Anfrage präziser formulieren." };
}
