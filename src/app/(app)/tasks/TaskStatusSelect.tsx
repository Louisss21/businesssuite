"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";

export function TaskStatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  return (
    <Select
      defaultValue={status}
      className="w-36"
      onChange={async (e) => {
        await fetch(`/api/tasks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: e.target.value }),
        });
        router.refresh();
      }}
    >
      <option value="OPEN">OPEN</option>
      <option value="IN_PROGRESS">IN_PROGRESS</option>
      <option value="DONE">DONE</option>
      <option value="CANCELLED">CANCELLED</option>
    </Select>
  );
}
