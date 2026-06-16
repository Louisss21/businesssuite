"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

/** A3: Logo-Vorschau + Upload/Entfernen in den Einstellungen. */
export function LogoUpload({ initialUrl }: { initialUrl: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setUrl(body.data?.logoUrl ?? "");
      router.refresh();
    } else {
      setError(body.error ?? "Upload fehlgeschlagen");
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings/logo", { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setUrl("");
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Entfernen fehlgeschlagen");
    }
  }

  return (
    <Card className="mb-4 p-5">
      <h3 className="text-sm font-semibold text-slate-900">Firmenlogo</h3>
      <p className="mt-1 text-xs text-slate-500">
        PNG, JPG oder SVG (max. 2 MB). Erscheint im Kopf aller PDFs (Angebot,
        Rechnung, Auftragsbestätigung, Lieferschein). Hinweis: in PDFs werden nur
        PNG/JPG eingebettet.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Logo" className="max-h-16 max-w-36 object-contain" />
          ) : (
            <span className="text-xs text-slate-400">Kein Logo</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
            className="block text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
          {url && (
            <Button variant="ghost" onClick={remove} disabled={busy} className="self-start">
              Logo entfernen
            </Button>
          )}
        </div>
      </div>

      {busy && <p className="mt-2 text-xs text-slate-400">Wird verarbeitet…</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </Card>
  );
}
