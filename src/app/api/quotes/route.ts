import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { quoteService } from "@/modules/quotes/quote.service";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    return ok(await quoteService.list({ status: req.nextUrl.searchParams.get("status") || undefined }));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    return ok(await quoteService.create(await req.json()), 201);
  } catch (e) {
    return fail(e);
  }
}
