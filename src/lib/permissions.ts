import type { Role } from "./auth";

/**
 * Zentrale rollenbasierte Zugriffsmatrix (einzige Quelle der Wahrheit).
 * Genutzt von Middleware (Seiten + API), den API-Guards und der Navigation.
 *
 *  "write" = sehen + anlegen/ändern/löschen
 *  "read"  = nur sehen (GET), schreibende Methoden werden mit 403 abgelehnt
 *  "none"  = kein Zugriff
 *
 * ADMIN und MEMBER (Legacy-Vollzugriff) haben überall "write".
 */

export type Access = "none" | "read" | "write";

export type ModuleKey =
  | "dashboard"
  | "crm"
  | "leads"
  | "quotes"
  | "orders"
  | "products"
  | "production"
  | "inventory"
  | "invoices"
  | "billing-archive"
  | "tasks"
  | "campaigns"
  | "settings";

const MATRIX: Record<ModuleKey, Partial<Record<Role, Access>>> = {
  dashboard: { ADMIN: "write", SALES: "read", MARKETING: "read", WAREHOUSE: "read", ACCOUNTING: "read" },
  crm: { ADMIN: "write", SALES: "write", MARKETING: "read", ACCOUNTING: "read" },
  leads: { ADMIN: "write", SALES: "write", MARKETING: "write" },
  quotes: { ADMIN: "write", SALES: "write", ACCOUNTING: "read" },
  orders: { ADMIN: "write", SALES: "write", WAREHOUSE: "read", ACCOUNTING: "read" },
  products: { ADMIN: "write", SALES: "read", WAREHOUSE: "write" },
  production: { ADMIN: "write", WAREHOUSE: "write" },
  inventory: { ADMIN: "write", WAREHOUSE: "write" },
  invoices: { ADMIN: "write", SALES: "read", ACCOUNTING: "write" },
  "billing-archive": { ADMIN: "write", ACCOUNTING: "write" },
  tasks: { ADMIN: "write", SALES: "write", MARKETING: "write", WAREHOUSE: "write", ACCOUNTING: "write" },
  campaigns: { ADMIN: "write", MARKETING: "write" },
  settings: { ADMIN: "write" },
};

/** Zugriffsstufe einer Rolle auf ein Modul. */
export function accessFor(role: Role, module: ModuleKey): Access {
  if (role === "ADMIN" || role === "MEMBER") return "write";
  return MATRIX[module][role] ?? "none";
}

export const ALL_MODULES = Object.keys(MATRIX) as ModuleKey[];

// ---- Pfad → Modul (Seiten) ----
const PAGE_PREFIX: [string, ModuleKey][] = [
  ["/crm", "crm"],
  ["/leads", "leads"],
  ["/quotes", "quotes"],
  ["/orders", "orders"],
  ["/products", "products"],
  ["/production", "production"],
  ["/inventory", "inventory"],
  ["/invoices", "invoices"],
  ["/billing-archive", "billing-archive"],
  ["/tasks", "tasks"],
  ["/campaigns", "campaigns"],
  ["/settings", "settings"],
];

export function pageModule(pathname: string): ModuleKey | null {
  if (pathname === "/") return "dashboard";
  for (const [p, m] of PAGE_PREFIX) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return m;
  }
  return null; // unbekannte/neutrale Seite (z. B. /403) -> erlaubt
}

// ---- Pfad → Modul (API) ----
const API_PREFIX: [string, ModuleKey][] = [
  ["/api/customers", "crm"],
  ["/api/activities", "crm"],
  ["/api/leads", "leads"],
  ["/api/quotes", "quotes"],
  ["/api/orders", "orders"],
  ["/api/products", "products"],
  ["/api/table-models", "production"],
  ["/api/production", "production"],
  ["/api/components", "inventory"],
  ["/api/suppliers", "inventory"],
  ["/api/invoices", "invoices"],
  ["/api/billing-archive", "billing-archive"],
  ["/api/incoming-invoices", "billing-archive"],
  ["/api/tasks", "tasks"],
  ["/api/campaigns", "campaigns"],
  ["/api/users", "settings"],
  ["/api/settings", "settings"],
];

export function apiModule(pathname: string): ModuleKey | null {
  for (const [p, m] of API_PREFIX) {
    if (pathname === p || pathname.startsWith(`${p}/`)) return m;
  }
  return null; // /api/auth, /api/search, /api/health, /api/cron, /api/webhooks -> neutral
}

/** Darf die Rolle die Seite sehen? */
export function canAccessPage(role: Role, pathname: string): boolean {
  const m = pageModule(pathname);
  if (!m) return true;
  return accessFor(role, m) !== "none";
}

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Darf die Rolle diese API-Anfrage (Methode+Pfad) ausführen? */
export function canAccessApi(role: Role, method: string, pathname: string): boolean {
  const m = apiModule(pathname);
  if (!m) return true; // neutrale/öffentliche API
  const acc = accessFor(role, m);
  if (acc === "none") return false;
  if (acc === "write") return true;
  // acc === "read": nur lesende Methoden erlaubt
  return READ_METHODS.has(method.toUpperCase());
}
