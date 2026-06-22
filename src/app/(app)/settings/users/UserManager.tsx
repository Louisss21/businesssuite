"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, Input, Select, Table, Th, Td } from "@/components/ui";

const ROLES = ["ADMIN", "SALES", "MARKETING", "WAREHOUSE", "ACCOUNTING"];

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
}

export function UserManager({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  function startEdit(u: UserRow) {
    setEditId(u.id);
    setEditEmail(u.email);
    setEditPassword("");
  }

  async function saveEdit(id: string) {
    const body: Record<string, unknown> = { email: editEmail };
    if (editPassword) body.password = editPassword;
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setEditId(null);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      window.alert(b.error ?? "Speichern fehlgeschlagen");
    }
  }

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    setSaving(false);
    if (res.ok) {
      (e.target as HTMLFormElement).reset();
      setOpen(false);
      router.refresh();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? "Einladen fehlgeschlagen");
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) router.refresh();
    else {
      const b = await res.json().catch(() => ({}));
      window.alert(b.error ?? "Änderung fehlgeschlagen");
      router.refresh();
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Benutzer „${name}" wirklich löschen?`)) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else {
      const b = await res.json().catch(() => ({}));
      window.alert(b.error ?? "Löschen fehlgeschlagen");
    }
  }

  return (
    <div className="space-y-4">
      {open ? (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-semibold text-slate-900">Benutzer einladen</h3>
          <form onSubmit={invite} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input name="name" required />
              </Field>
              <Field label="E-Mail">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Rolle">
                <Select name="role" defaultValue="SALES">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Initialpasswort (optional)">
                <Input name="password" type="text" placeholder="min. 6 Zeichen" />
              </Field>
            </div>
            <p className="text-xs text-slate-400">
              Ohne Passwort wird das Konto angelegt, kann sich aber erst nach Passwort-Vergabe anmelden.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Einladen…" : "Einladen"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button onClick={() => setOpen(true)}>+ Benutzer einladen</Button>
      )}

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>E-Mail</Th>
            <Th>Rolle</Th>
            <Th>Aktiv</Th>
            <Th className="text-right">Aktionen</Th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            return (
              <Fragment key={u.id}>
              <tr>
                <Td className="font-medium text-slate-900">
                  {u.name} {isSelf && <span className="text-xs text-slate-400">(du)</span>}
                </Td>
                <Td>{u.email}</Td>
                <Td>
                  <Select
                    className="w-40"
                    defaultValue={u.role}
                    disabled={isSelf}
                    onChange={(e) => patch(u.id, { role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                    {u.role === "MEMBER" && <option value="MEMBER">MEMBER</option>}
                  </Select>
                </Td>
                <Td>
                  <button
                    type="button"
                    disabled={isSelf}
                    onClick={() => patch(u.id, { active: !u.active })}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      u.active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                    } ${isSelf ? "opacity-60" : "hover:opacity-80"}`}
                  >
                    {u.active ? "Aktiv" : "Inaktiv"}
                  </button>
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(u)}
                      title="E-Mail / Passwort ändern"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-700"
                    >
                      ✎
                    </button>
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => remove(u.id, u.name)}
                        title="Löschen"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
              {editId === u.id && (
                <tr>
                  <td colSpan={5} className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-xs text-slate-600">
                        <span className="mb-1 block">E-Mail</span>
                        <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-64" />
                      </label>
                      <label className="text-xs text-slate-600">
                        <span className="mb-1 block">Neues Passwort (optional)</span>
                        <Input type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="min. 6 Zeichen" className="w-56" />
                      </label>
                      <Button onClick={() => saveEdit(u.id)}>Speichern</Button>
                      <Button variant="ghost" onClick={() => setEditId(null)}>Abbrechen</Button>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
