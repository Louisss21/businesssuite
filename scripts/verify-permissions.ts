/**
 * RBAC-Nachweis (serverseitige Matrix). Ausführen mit:
 *   npx tsx scripts/verify-permissions.ts
 *
 * Prüft canAccessPage / canAccessApi (lib/permissions) für die geforderten Fälle.
 * Diese Matrix wird identisch von Middleware (Seiten + API) und Navigation genutzt.
 */
import { canAccessApi, canAccessPage } from "../src/lib/permissions";

let failed = 0;
function check(desc: string, actual: boolean, expected: boolean) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${desc}  -> ${actual} (erwartet ${expected})`);
}

// WAREHOUSE
check("WAREHOUSE GET /invoices (Seite)", canAccessPage("WAREHOUSE", "/invoices"), false);
check("WAREHOUSE POST /api/invoices", canAccessApi("WAREHOUSE", "POST", "/api/invoices"), false);
check("WAREHOUSE GET /inventory (Seite)", canAccessPage("WAREHOUSE", "/inventory"), true);
check("WAREHOUSE GET /api/components", canAccessApi("WAREHOUSE", "GET", "/api/components"), true);

// ACCOUNTING
check("ACCOUNTING /invoices (Seite)", canAccessPage("ACCOUNTING", "/invoices"), true);
check("ACCOUNTING POST /api/invoices", canAccessApi("ACCOUNTING", "POST", "/api/invoices"), true);
check("ACCOUNTING /leads (Seite)", canAccessPage("ACCOUNTING", "/leads"), false);

// MARKETING
check("MARKETING /campaigns (Seite)", canAccessPage("MARKETING", "/campaigns"), true);
check("MARKETING /settings/users (Seite)", canAccessPage("MARKETING", "/settings/users"), false);
check("MARKETING POST /api/users", canAccessApi("MARKETING", "POST", "/api/users"), false);

// SALES
check("SALES POST /api/quotes", canAccessApi("SALES", "POST", "/api/quotes"), true);
check("SALES /settings (Seite)", canAccessPage("SALES", "/settings"), false);
check("SALES POST /api/invoices (nur lesend)", canAccessApi("SALES", "POST", "/api/invoices"), false);
check("SALES GET /api/invoices (lesend ok)", canAccessApi("SALES", "GET", "/api/invoices"), true);

// ADMIN – alles erlaubt
check("ADMIN /settings", canAccessPage("ADMIN", "/settings"), true);
check("ADMIN POST /api/invoices", canAccessApi("ADMIN", "POST", "/api/invoices"), true);
check("ADMIN POST /api/users", canAccessApi("ADMIN", "POST", "/api/users"), true);

console.log(failed === 0 ? "\nAlle Prüfungen bestanden." : `\n${failed} Prüfung(en) fehlgeschlagen.`);
if (failed > 0) process.exit(1);
