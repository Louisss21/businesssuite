import { prisma } from "@/lib/db";

// TEMPORÄR (Diagnose): zeigt, ob die Modell-Migration in der Live-DB angekommen ist.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const models = await prisma.tableModel.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { steps: true, orders: true } }, product: { select: { name: true } } },
  });
  const compActive = await prisma.component.count({ where: { active: true } });
  const compInactive = await prisma.component.count({ where: { active: false } });
  return Response.json({
    models: models.map((m) => ({
      name: m.name,
      active: m.active,
      steps: m._count.steps,
      orders: m._count.orders,
      product: m.product?.name ?? null,
    })),
    components: { active: compActive, inactive: compInactive },
  });
}
