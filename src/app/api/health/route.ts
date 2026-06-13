import { prisma } from "@/lib/db";

/**
 * Diagnose-Endpoint: /api/health
 * Beantwortet ohne Login, ob die Datenbank korrekt eingerichtet ist.
 * Hilft bei Deploy-Problemen (DATABASE_URL fehlt / Tabellen fehlen / kein User).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    databaseUrlSet: Boolean(process.env.DATABASE_URL),
    nodeEnv: process.env.NODE_ENV,
  };

  if (!process.env.DATABASE_URL) {
    result.ok = false;
    result.hint =
      "DATABASE_URL ist nicht gesetzt. In Vercel unter Storage eine Postgres-DB anlegen und mit dem Projekt verbinden, dann neu deployen.";
    return Response.json(result, { status: 500 });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.dbConnected = true;
  } catch (e) {
    result.ok = false;
    result.dbConnected = false;
    result.error = e instanceof Error ? e.message : String(e);
    result.hint = "Verbindung zur Datenbank fehlgeschlagen. DATABASE_URL prüfen.";
    return Response.json(result, { status: 500 });
  }

  try {
    result.userCount = await prisma.user.count();
    result.ok = (result.userCount as number) > 0;
    if (result.userCount === 0) {
      result.hint =
        "DB verbunden, aber kein User vorhanden. Der Seed (npm run db:seed bzw. der Build-Step) muss laufen, um den Admin-User anzulegen.";
    }
  } catch (e) {
    result.ok = false;
    result.error = e instanceof Error ? e.message : String(e);
    result.hint =
      "Tabellen fehlen vermutlich. Deployment muss den aktuellen Build (prisma db push) ausführen.";
    return Response.json(result, { status: 500 });
  }

  return Response.json(result, { status: result.ok ? 200 : 500 });
}
