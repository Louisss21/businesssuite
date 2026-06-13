import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Einheitliche API-Antwortformate + zentrales Fehler-Mapping.
 * Hält die API-Routen schlank: nur Auth-Check, Parsen, Service-Aufruf.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const notFound = (msg = "Nicht gefunden") => new AppError(msg, 404);
export const unauthorized = (msg = "Nicht autorisiert") => new AppError(msg, 401);

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validierungsfehler", issues: error.flatten() },
      { status: 422 },
    );
  }
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  // Prisma-Fehler in verständliche, handlungsleitende Meldungen übersetzen.
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("[API] Prisma-Init/DB nicht erreichbar:", error.message);
    return NextResponse.json(
      {
        error:
          "Datenbank nicht erreichbar. Prüfe, ob auf Vercel die Variable DATABASE_URL gesetzt und eine Postgres-Datenbank verbunden ist.",
        code: "DB_UNREACHABLE",
      },
      { status: 500 },
    );
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2021" || error.code === "P2022") {
      console.error("[API] Tabellen/Spalten fehlen:", error.code, error.message);
      return NextResponse.json(
        {
          error:
            "Datenbank-Schema fehlt. Das Deployment muss mit dem aktuellen Build laufen (prisma db push), damit die Tabellen angelegt werden.",
          code: error.code,
        },
        { status: 500 },
      );
    }
    if (error.code === "P1001") {
      return NextResponse.json(
        { error: "Datenbankserver nicht erreichbar (P1001).", code: "P1001" },
        { status: 500 },
      );
    }
  }

  console.error("[API] Unerwarteter Fehler:", error);
  // Im Nicht-Produktionsmodus den echten Fehlertext zurückgeben (Debugging).
  const detail =
    process.env.NODE_ENV !== "production" && error instanceof Error
      ? error.message
      : undefined;
  return NextResponse.json(
    { error: "Interner Serverfehler", detail },
    { status: 500 },
  );
}
