import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, PageHeader, Badge, Table, Th, Td, Empty } from "@/components/ui";
import { formatEUR } from "@/lib/money";
import { displayName } from "@/modules/crm/customer.service";
import { taskService } from "@/modules/tasks/task.service";

export const dynamic = "force-dynamic";

function dueClass(due: Date | null) {
  if (!due) return "text-slate-500";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  if (d < today) return "font-medium text-red-600";
  if (d.getTime() === today.getTime()) return "font-medium text-amber-600";
  return "text-slate-700";
}

async function getStats() {
  const [
    customers,
    openLeads,
    openOrders,
    openInvoices,
    openSum,
    recentInvoices,
    openTasks,
    dueTasks,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.lead.count({ where: { status: { in: ["NEW", "CONTACTED", "QUALIFIED"] } } }),
    prisma.order.count({ where: { status: { in: ["DRAFT", "CONFIRMED", "IN_PROGRESS"] } } }),
    prisma.invoice.count({ where: { status: "OPEN" } }),
    prisma.invoice.aggregate({ where: { status: "OPEN" }, _sum: { grossTotal: true } }),
    prisma.invoice.findMany({
      take: 5,
      orderBy: { issueDate: "desc" },
      include: { customer: true },
    }),
    taskService.openCount(),
    taskService.dueSoon(5),
  ]);
  return {
    customers,
    openLeads,
    openOrders,
    openInvoices,
    openSum: openSum._sum.grossTotal ?? 0,
    recentInvoices,
    openTasks,
    dueTasks,
  };
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href}>
      <Card className="p-5 transition hover:shadow-md">
        <div className="text-sm text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const s = await getStats();
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Überblick über dein Geschäft" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Kunden" value={String(s.customers)} href="/crm" />
        <Stat label="Offene Leads" value={String(s.openLeads)} href="/leads" />
        <Stat label="Offene Bestellungen" value={String(s.openOrders)} href="/orders" />
        <Stat
          label="Offene Rechnungen"
          value={`${s.openInvoices} · ${formatEUR(s.openSum)}`}
          href="/invoices"
        />
        <Stat label="Offene Aufgaben" value={String(s.openTasks)} href="/tasks" />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">
        Aufgaben heute &amp; überfällig
      </h2>
      <Card className="divide-y divide-slate-100">
        {s.dueTasks.map((t) => (
          <Link
            key={t.id}
            href={`/tasks/${t.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
          >
            <span className="text-sm font-medium text-slate-800">{t.title}</span>
            <span className={`text-sm ${dueClass(t.dueAt)}`}>
              {t.dueAt ? new Date(t.dueAt).toLocaleDateString("de-DE") : "—"}
            </span>
          </Link>
        ))}
        {s.dueTasks.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-slate-400">
            Keine fälligen Aufgaben. 🎉
          </div>
        )}
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">
        Neueste Rechnungen
      </h2>
      <Table>
        <thead>
          <tr>
            <Th>Nummer</Th>
            <Th>Kunde</Th>
            <Th>Datum</Th>
            <Th>Status</Th>
            <Th className="text-right">Brutto</Th>
          </tr>
        </thead>
        <tbody>
          {s.recentInvoices.map((inv) => (
            <tr key={inv.id}>
              <Td>
                <Link href={`/invoices/${inv.id}`} className="font-medium text-brand-700">
                  {inv.invoiceNumber}
                </Link>
              </Td>
              <Td>{displayName(inv.customer)}</Td>
              <Td>{inv.issueDate.toLocaleDateString("de-DE")}</Td>
              <Td>
                <Badge value={inv.status} />
              </Td>
              <Td className="text-right">{formatEUR(inv.grossTotal)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {s.recentInvoices.length === 0 && <Empty>Noch keine Rechnungen vorhanden.</Empty>}
    </>
  );
}
