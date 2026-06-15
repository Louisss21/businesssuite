import { prisma } from "@/lib/db";
import { displayName } from "@/modules/crm/customer.service";

export interface SearchHit {
  type: string;
  label: string;
  sub: string;
  href: string;
}

export async function globalSearch(qRaw: string): Promise<SearchHit[]> {
  const q = qRaw.trim();
  if (q.length < 2) return [];
  const ci = { contains: q, mode: "insensitive" as const };
  const take = 5;

  const [customers, leads, quotes, orders, invoices, products, prodOrders] = await Promise.all([
    prisma.customer.findMany({
      where: { OR: [{ companyName: ci }, { firstName: ci }, { lastName: ci }, { email: ci }] },
      take,
    }),
    prisma.lead.findMany({
      where: { OR: [{ title: ci }, { company: ci }, { email: ci }, { lastName: ci }] },
      take,
    }),
    prisma.quote.findMany({ where: { number: ci }, take }),
    prisma.order.findMany({ where: { orderNumber: ci }, take }),
    prisma.invoice.findMany({ where: { invoiceNumber: ci }, take }),
    prisma.product.findMany({ where: { OR: [{ sku: ci }, { name: ci }] }, take }),
    prisma.productionOrder.findMany({
      where: { serialNumber: ci },
      take,
      include: { tableModel: { select: { name: true } } },
    }),
  ]);

  const hits: SearchHit[] = [
    ...customers.map((c) => ({ type: "Kunde", label: displayName(c), sub: c.email ?? "", href: `/crm/${c.id}` })),
    ...leads.map((l) => ({ type: "Lead", label: l.title, sub: l.company ?? l.email ?? "", href: `/leads/${l.id}` })),
    ...quotes.map((x) => ({ type: "Angebot", label: x.number, sub: "", href: `/quotes/${x.id}` })),
    ...orders.map((o) => ({ type: "Bestellung", label: o.orderNumber, sub: "", href: `/orders/${o.id}` })),
    ...invoices.map((i) => ({ type: "Rechnung", label: i.invoiceNumber, sub: "", href: `/invoices/${i.id}` })),
    ...products.map((p) => ({ type: "Produkt", label: p.name, sub: p.sku, href: `/products/${p.id}` })),
    ...prodOrders.map((po) => ({
      type: "Seriennummer",
      label: po.serialNumber ?? "—",
      sub: po.tableModel.name,
      href: `/production/${po.id}`,
    })),
  ];
  return hits;
}
