"use client";

import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";

const STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED"];

export function CampaignControls({
  id,
  status,
  hasRecipients,
}: {
  id: string;
  status: string;
  hasRecipients: boolean;
}) {
  const router = useRouter();

  async function changeStatus(value: string) {
    await fetch(`/api/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    router.refresh();
  }

  async function markSent() {
    await fetch(`/api/campaigns/${id}/sent`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select defaultValue={status} className="w-40" onChange={(e) => changeStatus(e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      {hasRecipients && (
        <>
          <Button type="button" variant="ghost" onClick={markSent}>
            Als versendet markieren
          </Button>
          <a
            href={`/api/campaigns/${id}/export`}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ Adressliste (CSV)
          </a>
        </>
      )}
    </div>
  );
}
