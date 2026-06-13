"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";

export function InvoiceStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  return (
    <Select
      defaultValue={status}
      className="w-36"
      onChange={async (e) => {
        await fetch(`/api/invoices/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: e.target.value }),
        });
        router.refresh();
      }}
    >
      <option value="OPEN">OPEN</option>
      <option value="PAID">PAID</option>
      <option value="OVERDUE">OVERDUE</option>
    </Select>
  );
}
