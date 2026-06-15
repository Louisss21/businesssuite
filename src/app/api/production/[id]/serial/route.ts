import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { productionService } from "@/modules/production/production.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const { serial } = z.object({ serial: z.string() }).parse(await req.json());
    return ok(await productionService.saveSerial(params.id, serial));
  } catch (e) {
    return fail(e);
  }
}
