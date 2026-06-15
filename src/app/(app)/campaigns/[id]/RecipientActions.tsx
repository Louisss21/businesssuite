"use client";

import { useRouter } from "next/navigation";

export function RecipientActions({
  campaignId,
  recipientId,
  responded,
  converted,
}: {
  campaignId: string;
  recipientId: string;
  responded: boolean;
  converted: boolean;
}) {
  const router = useRouter();

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/campaigns/${campaignId}/recipients/${recipientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  async function remove() {
    await fetch(`/api/campaigns/${campaignId}/recipients/${recipientId}`, { method: "DELETE" });
    router.refresh();
  }

  const pill = (active: boolean) =>
    `rounded-full px-2.5 py-0.5 text-xs font-medium ${
      active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
    }`;

  return (
    <div className="flex items-center justify-end gap-1">
      <button className={pill(responded)} onClick={() => patch({ responded: !responded })}>
        Antwort
      </button>
      <button className={pill(converted)} onClick={() => patch({ converted: !converted })}>
        Konvertiert
      </button>
      <button
        onClick={remove}
        title="Entfernen"
        className="rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
      >
        🗑
      </button>
    </div>
  );
}
