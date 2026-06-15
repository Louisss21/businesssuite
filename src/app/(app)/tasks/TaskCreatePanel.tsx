"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { TaskForm } from "./TaskForm";

type Option = { id: string; name: string };

export function TaskCreatePanel({
  users,
  customers,
}: {
  users: Option[];
  customers: Option[];
}) {
  const [open, setOpen] = useState(false);
  if (!open) return <Button onClick={() => setOpen(true)}>+ Neue Aufgabe</Button>;
  return (
    <div className="mb-6">
      <TaskForm users={users} customers={customers} onDone={() => setOpen(false)} />
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mt-2 text-sm text-slate-500 hover:text-slate-700"
      >
        Abbrechen
      </button>
    </div>
  );
}
