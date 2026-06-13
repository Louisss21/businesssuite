import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { quoteService } from "@/modules/quotes/quote.service";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await quoteService.getById(params.id));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    return ok(await quoteService.update(params.id, await req.json()));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requireUser();
    await quoteService.delete(params.id);
    return ok({ success: true });
  } catch (e) {
    return fail(e);
  }
}
