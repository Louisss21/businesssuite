import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { exportService } from "@/modules/billing-archive/export.service";

const num = (v: string | null) => (v ? Number(v) : undefined);

/**
 * CSV-Export von Rechnungen eines Zeitraums.
 *   /api/billing-archive/export?year=2026            -> ganzes Jahr
 *   /api/billing-archive/export?year=2026&quarter=1  -> Q1
 *   /api/billing-archive/export?year=2026&month=1    -> Januar
 * Optional: &customerId=...&status=PAID
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const sp = req.nextUrl.searchParams;
    const year = num(sp.get("year"));
    if (!year) return fail(new Error("year erforderlich"));

    const filter = {
      year,
      quarter: num(sp.get("quarter")),
      month: num(sp.get("month")),
      customerId: sp.get("customerId") || undefined,
      status: sp.get("status") || undefined,
    };

    const rows = await exportService.rows(filter);
    const csv = exportService.toCSV(rows);
    const name = `rechnungen_${year}${filter.quarter ? `_Q${filter.quarter}` : ""}${
      filter.month ? `_M${filter.month}` : ""
    }.csv`;

    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
