"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUS = [
  { value: "", label: "Alle Status" },
  { value: "NEW", label: "Neu" },
  { value: "CONTACTED", label: "Kontaktiert" },
  { value: "QUALIFIED", label: "Qualifiziert" },
  { value: "WON", label: "Gewonnen" },
  { value: "LOST", label: "Verloren" },
];

/**
 * Filterleiste der Leads-Liste: Zuständigkeit ("Meine Leads", einzelne
 * Mitarbeiter, ohne Zuweisung) + Status. Schreibt die Auswahl in die URL
 * (?assigned=…&status=…), gefiltert wird serverseitig in page.tsx.
 */
export function LeadsFilter({
  users,
  count,
}: {
  users: { id: string; name: string }[];
  count: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const assigned = params.get("assigned") ?? "";
  const status = params.get("status") ?? "";

  function setParam(key: "assigned" | "status", value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/leads${next.size ? `?${next}` : ""}`);
  }

  const selectCls =
    "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="label">Filter</span>
      <select
        value={assigned}
        onChange={(e) => setParam("assigned", e.target.value)}
        className={selectCls}
      >
        <option value="">Alle Zuständigen</option>
        <option value="me">Meine Leads</option>
        <option value="none">Ohne Zuweisung</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => setParam("status", e.target.value)}
        className={selectCls}
      >
        {STATUS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {(assigned || status) && (
        <button
          onClick={() => router.replace("/leads")}
          className="rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          ✕ Zurücksetzen
        </button>
      )}
      <span className="ml-auto text-sm text-slate-500">
        {count} Lead{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}
