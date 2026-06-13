import { NextRequest, NextResponse } from "next/server";

/**
 * Leichtgewichtiger Guard im Edge-Runtime: prüft nur die Existenz des
 * Session-Cookies und leitet sonst auf /login. Die kryptografische
 * Verifikation passiert serverseitig in getCurrentUser() (Node-Runtime).
 */
const PUBLIC = ["/login", "/api/auth/login", "/api/health"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasSession = req.cookies.has("bs_session");
  if (!hasSession) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // alles außer statischen Assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
