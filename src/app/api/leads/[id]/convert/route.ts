import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { leadService } from "@/modules/crm/lead.service";

/** Wandelt einen Lead in einen Kunden um. */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const customer = await leadService.convert(params.id);
    return ok(customer, 201);
  } catch (e) {
    return fail(e);
  }
}
