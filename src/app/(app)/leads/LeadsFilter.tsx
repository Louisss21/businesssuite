"use client";

import { useRouter } from "next/navigation";
import { LEAD_STATUS_OPTIONS } from "@/modules/crm/lead.schema";

const STATUS = [{ value: "", label: "Alle Status" }, ...LEAD_STATUS_OPTIONS];

/**
 * Cookie, in dem die gewählte Filterung gemerkt wird. Wird auch in page.tsx
 * serverseitig gelesen, damit die Liste sofort gefiltert gerendert wird.
 */
export const LEADS_FILTER_COOKIE = "bs-leads-filter";

/** Filter merken (bzw. Cookie löschen, wenn nichts gefiltert ist). */
function persist(assigned: string, status: string) {
  const q = new URLSearchParams();
  if (assigned) q.set("assigned", assigned);
  if (status) q.set("status", status);
  const base = `${LEADS_FILTER_COOKIE}=`;
  document.cookie = q.size
    ? `${base}${encodeURIComponent(q.toString())}; path=/; max-age=31536000; samesite=lax`
    : `${base}; path=/; max-age=0; samesite=lax`;
}

/**
 * Filterleiste der Leads-Liste: Zuständigkeit (einzelne Mitarbeiter, ohne
 * Zuweisung) + Status. Gefiltert wird serverseitig in page.tsx.
 *
 * Die Auswahl steht in der URL (?assigned=…&status=…) UND in einem Cookie:
 * Ruft man /leads ohne Parameter auf (z. B. über die Navigation), greift der
 * gemerkte Filter weiter. Er bleibt gesetzt, bis „Zurücksetzen" geklickt oder
 * überall „Alle" gewählt wird. `assigned`/`status` kommen als effektive Werte
 * vom Server – nicht aus der URL, die bei Cookie-Filterung leer sein kann.
 */
export function LeadsFilter({
  users,
  count,
  assigned,
  status,
}: {
  users: { id: string; name: string }[];
  count: number;
  assigned: string;
  status: string;
}) {
  const router = useRouter();

  function apply(nextAssigned: string, nextStatus: string) {
    persist(nextAssigned, nextStatus);
    const q = new URLSearchParams();
    if (nextAssigned) q.set("assigned", nextAssigned);
    if (nextStatus) q.set("status", nextStatus);
    router.replace(`/leads${q.size ? `?${q}` : ""}`);
    // Router-Cache verwerfen: sonst kann ein späterer Klick auf "Leads" in der
    // Navigation eine gecachte Seitenversion mit dem alten Filterstand zeigen.
    router.refresh();
  }

  const selectCls =
    "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500";

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="label">Filter</span>
      <select
        value={assigned}
        onChange={(e) => apply(e.target.value, status)}
        className={selectCls}
      >
        <option value="">Alle Zuständigen</option>
        <option value="none">Ohne Zuweisung</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => apply(assigned, e.target.value)}
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
          onClick={() => apply("", "")}
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
