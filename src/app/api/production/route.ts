import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { productionService } from "@/modules/production/production.service";

export async function GET() {
  try {
    await requireUser();
    return ok(await productionService.listOrders());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const { tableModelId } = z.object({ tableModelId: z.string().min(1) }).parse(await req.json());
    return ok(await productionService.start(tableModelId), 201);
  } catch (e) {
    return fail(e);
  }
}
