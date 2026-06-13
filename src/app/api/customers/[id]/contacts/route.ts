import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { customerService } from "@/modules/crm/customer.service";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const data = await customerService.addContact(params.id, await req.json());
    return ok(data, 201);
  } catch (e) {
    return fail(e);
  }
}
