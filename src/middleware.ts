import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/lib/auth";
import { canAccessApi, canAccessPage } from "@/lib/permissions";

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
