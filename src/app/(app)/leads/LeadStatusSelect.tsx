"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";

export function LeadStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  return (
    <Select
      defaultValue={status}
      className="w-40"
      onChange={async (e) => {
        await fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: e.target.value }),
        });
        router.refresh();
      }}
    >
      <option value="NEW">NEW</option>
      <option value="CONTACTED">CONTACTED</option>
      <option value="QUALIFIED">QUALIFIED</option>
      <option value="WON">WON</option>
      <option value="LOST">LOST</option>
    </Select>
  );
}
