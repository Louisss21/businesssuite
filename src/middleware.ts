import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/lib/auth";
import { canAccessApi, canAccessPage } from "@/lib/permissions";
import {
  apiTokenFromHeaders,
  apiTokenFromQuery,
  apiTokenReadOnly,
  apiTokenRole,
  isValidApiToken,
  isWriteMethod,
  queryTokenAllowed,
} from "@/lib/api-token";

/**
 * Zugriffs-Schranke (Edge):
 *  - prüft Session-Cookie (Auth)
 *  - setzt rollenbasierte Zugriffskontrolle für Seiten UND API durch
 *    (Rolle aus der signierten Session; Matrix aus lib/permissions.ts)
 *
 * Sicherheits-Backstop: Datenzugriffe verifizieren die Session zusätzlich in
 * Node (getCurrentUser: HMAC + frische DB-Rolle + active-Check). Die Middleware
 * ist die Vorab-Schranke und failt im Zweifel offen Richtung Node-Prüfung.
 */
const PUBLIC = [
  "/login",
  "/api/auth/login",
  "/api/health",
  "/api/cron",
  "/api/webhooks",
];

const ROLES: Role[] = ["ADMIN", "SALES", "MARKETING", "WAREHOUSE", "ACCOUNTING", "MEMBER"];

/** Rolle aus dem signierten Cookie lesen (ohne Krypto – Node verifiziert separat). */
function roleFromToken(token: string): Role | null {
  const value = token.slice(0, token.lastIndexOf(".")); // HMAC abschneiden
  const part = value.split("|")[1]; // "userId|ROLE"
  return part && (ROLES as string[]).includes(part) ? (part as Role) : null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("bs_session")?.value;
  const isApi = pathname.startsWith("/api");

  // Externe Systeme (z. B. ein Claude-Cowork-Chat) melden sich per
  // API-Schluessel statt per Cookie an. Gilt ausschliesslich fuer /api/*.
  // Bevorzugt per Kopfzeile; als Notloesung fuer Werkzeuge ohne eigene
  // Header-Unterstuetzung optional per URL-Parameter (siehe api-token.ts).
  if (isApi) {
    const headerToken = apiTokenFromHeaders(req.headers);
    const queryToken =
      !headerToken && queryTokenAllowed() ? apiTokenFromQuery(req.nextUrl.searchParams) : null;
    const apiToken = headerToken ?? queryToken;

    if (apiToken) {
      if (!isValidApiToken(apiToken)) {
        return NextResponse.json({ error: "Ungueltiger API-Schluessel" }, { status: 401 });
      }
      // Ein per URL uebergebener Schluessel kann in Logs/Verlaeufen landen -
      // deshalb IMMER nur lesend, unabhaengig von BS_API_READONLY.
      const readOnly = apiTokenReadOnly() || !!queryToken;
      if (readOnly && isWriteMethod(req.method)) {
        return NextResponse.json(
          {
            error: queryToken
              ? "Schluessel als URL-Parameter ist nur lesend erlaubt – fuer Schreibzugriff die Authorization-Kopfzeile nutzen"
              : "API-Zugang ist auf Lesen beschraenkt (BS_API_READONLY)",
          },
          { status: 403 },
        );
      }
      const apiRole = apiTokenRole() as Role;
      if (!canAccessApi(apiRole, req.method, pathname)) {
        return NextResponse.json({ error: "Kein Zugriff (Rolle)" }, { status: 403 });
      }
      // lib/auth.ts liest den Schluessel nur aus Kopfzeilen – bei
      // Query-Param-Auth deshalb synthetisch als Header durchreichen.
      if (queryToken) {
        const outHeaders = new Headers(req.headers);
        outHeaders.set("x-api-key", queryToken);
        return NextResponse.next({ request: { headers: outHeaders } });
      }
      return NextResponse.next();
    }
  }

  if (!token) {
    if (isApi) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Rollenbasierte Schranke (nur wenn Rolle aus dem Cookie lesbar ist).
  const role = roleFromToken(token);
  if (role) {
    if (isApi) {
      if (!canAccessApi(role, req.method, pathname)) {
        return NextResponse.json({ error: "Kein Zugriff (Rolle)" }, { status: 403 });
      }
    } else if (!canAccessPage(role, pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/403";
      return NextResponse.redirect(url);
    }
  }

  // aktuellen Pfad als Header durchreichen -> serverseitiger Rollen-Guard im Layout
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // alles außer statischen Assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
