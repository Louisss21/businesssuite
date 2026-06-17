"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Table, Th, Td, Empty } from "@/components/ui";
import { DeleteButton } from "@/components/DeleteButton";

export type SupplierRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  count: number;
};

export function SupplierManager({ suppliers }: { suppliers: SupplierRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setEmail("");
      setPhone("");
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  async function save(id: string, data: { name: string; email: string; phone: string }) {
    setBusy(true);
    const res = await fetch(`/api/suppliers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    if (res.ok) {
      setEditId(null);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      window.alert(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  return (
    <>
      <Card className="mb-6 p-5">
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Neuer Lieferant</h3>
        <form onSubmit={create} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="E-Mail"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Telefon"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <div className="flex items-end">
            <Button type="submit" disabled={busy || !name}>{busy ? "…" : "Anlegen"}</Button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>E-Mail</Th>
            <Th>Telefon</Th>
            <Th className="text-right">Bauteile</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <SupplierRowView
              key={s.id}
              s={s}
              editing={editId === s.id}
              busy={busy}
              onEdit={() => setEditId(s.id)}
              onCancel={() => setEditId(null)}
              onSave={(d) => save(s.id, d)}
            />
          ))}
        </tbody>
      </Table>
      {suppliers.length === 0 && <Empty>Noch keine Lieferanten.</Empty>}
    </>
  );
}

function SupplierRowView({
  s,
  editing,
  busy,
  onEdit,
  onCancel,
  onSave,
}: {
  s: SupplierRow;
  editing: boolean;
  busy: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (d: { name: string; email: string; phone: string }) => void;
}) {
  const [name, setName] = useState(s.name);
  const [email, setEmail] = useState(s.email ?? "");
  const [phone, setPhone] = useState(s.phone ?? "");

  if (editing) {
    return (
      <tr>
        <Td><Input value={name} onChange={(e) => setName(e.target.value)} /></Td>
        <Td><Input value={email} onChange={(e) => setEmail(e.target.value)} /></Td>
        <Td><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Td>
        <Td className="text-right">{s.count}</Td>
        <Td className="text-right">
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => onSave({ name, email, phone })} disabled={busy} className="text-sm font-medium text-brand-700">Speichern</button>
            <button onClick={onCancel} className="text-sm text-slate-500">Abbrechen</button>
          </div>
        </Td>
      </tr>
    );
  }
  return (
    <tr>
      <Td className="font-medium text-slate-900">{s.name}</Td>
      <Td className="text-slate-600">{s.email ?? "—"}</Td>
      <Td className="text-slate-600">{s.phone ?? "—"}</Td>
      <Td className="text-right">{s.count}</Td>
      <Td className="text-right">
        <div className="flex items-center justify-end gap-1">
          <button onClick={onEdit} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700" title="Bearbeiten">✎</button>
          <DeleteButton
            url={`/api/suppliers/${s.id}`}
            confirmText={`Lieferant „${s.name}" wirklich löschen? Zugeordnete Bauteile bleiben erhalten (Verknüpfung wird entfernt).`}
            iconOnly
          />
        </div>
      </Td>
    </tr>
  );
}
