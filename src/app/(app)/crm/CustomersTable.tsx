"use client";

import Link from "next/link";
import { Badge } from "@/components/ui";
import { DataTable, type Column } from "@/components/DataTable";
import { DeleteButton } from "@/components/DeleteButton";

export interface CustomerRow {
  id: string;
  name: string;
  typeLabel: string;
  email: string;
  orders: number;
  invoices: number;
}

const columns: Column<CustomerRow>[] = [
  {
    key: "name",
    header: "Name",
    sort: (c) => c.name.toLowerCase(),
    render: (c) => (
      <Link href={`/crm/${c.id}`} className="font-medium text-brand-700">
        {c.name}
      </Link>
    ),
  },
  { key: "type", header: "Typ", sort: (c) => c.typeLabel, render: (c) => <Badge value={c.typeLabel} /> },
  { key: "email", header: "E-Mail", sort: (c) => c.email.toLowerCase(), render: (c) => c.email || "—" },
  { key: "orders", header: "Bestellungen", align: "right", sort: (c) => c.orders, render: (c) => c.orders },
  { key: "invoices", header: "Rechnungen", align: "right", sort: (c) => c.invoices, render: (c) => c.invoices },
  {
    key: "actions",
    header: "Aktionen",
    align: "right",
    render: (c) => (
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/crm/${c.id}`}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
          title="Bearbeiten"
        >
          ✎
        </Link>
        <DeleteButton url={`/api/customers/${c.id}`} confirmText={`Kunde „${c.name}" wirklich löschen?`} iconOnly />
      </div>
    ),
  },
];

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  return (
    <DataTable
      rows={customers}
      columns={columns}
      filterText={(c) => `${c.name} ${c.email} ${c.typeLabel}`}
      empty="Noch keine Kunden angelegt."
      getRowId={(c) => c.id}
      bulk={{
        deleteUrl: "/api/customers/bulk-delete",
        updateUrl: "/api/customers/bulk-update",
        deleteNoun: "Kunde(n)",
        changeFields: [
          {
            key: "classification",
            label: "Klassifizierung",
            type: "select",
            options: ["A-Kunde", "B-Kunde", "C-Kunde", "VIP"].map((v) => ({ value: v, label: v })),
          },
        ],
      }}
    />
  );
}
