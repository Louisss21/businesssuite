import type { Role } from "./auth";

/**
 * Zentrale Routen-Zugriffsregeln (rollenbasiert). ADMIN & MEMBER sehen alles.
 * Wird in der (app)-Layout-Guard UND in der Sidebar-Navigation genutzt.
 */
const RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/crm", roles: ["SALES", "MARKETING"] },
  { prefix: "/leads", roles: ["SALES", "MARKETING"] },
  { prefix: "/quotes", roles: ["SALES"] },
  { prefix: "/orders", roles: ["SALES"] },
  { prefix: "/products", roles: ["WAREHOUSE", "SALES"] },
  { prefix: "/production", roles: ["WAREHOUSE"] },
  { prefix: "/inventory", roles: ["WAREHOUSE"] },
  { prefix: "/invoices", roles: ["ACCOUNTING"] },
  { prefix: "/billing-archive", roles: ["ACCOUNTING"] },
  { prefix: "/tasks", roles: ["SALES", "MARKETING"] },
  { prefix: "/campaigns", roles: ["MARKETING"] },
  { prefix: "/settings", roles: [] }, // nur ADMIN/MEMBER
];

export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === "ADMIN" || role === "MEMBER") return true;
  const rule = RULES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"),
  );
  if (!rule) return true; // Dashboard / unbekannt -> erlaubt
  return rule.roles.includes(role);
}
