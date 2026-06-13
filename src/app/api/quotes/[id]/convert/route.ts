import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { quoteService } from "@/modules/quotes/quote.service";

/** Wandelt ein Angebot in einen Auftrag um. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const order = await quoteService.convertToOrder(params.id);
    return ok(order, 201);
  } catch (e) {
    return fail(e);
  }
}
