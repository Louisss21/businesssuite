import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail } from "@/lib/http";
import { campaignService, recipientsToCSV } from "@/modules/campaigns/campaign.service";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const rows = await campaignService.exportRows(params.id);
    const csv = recipientsToCSV(rows);
    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kampagne_${params.id}_adressen.csv"`,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
