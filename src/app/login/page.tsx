"use client";

import { useState } from "react";
import { Button, Card, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      window.location.href = "/";
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Login fehlgeschlagen");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm p-8">
        <span className="flex items-center gap-2.5">
          <svg viewBox="0 0 96 96" className="h-7 w-7" aria-hidden>
            <path d="M 22.96 41 A 26 26 0 0 1 73.04 41" fill="none" stroke="#fff" strokeWidth="9" />
            <path d="M 22.96 55 A 26 26 0 0 0 73.04 55" fill="none" stroke="#fff" strokeWidth="9" />
            <rect x="12" y="43.5" width="72" height="9" fill="#F07D00" />
          </svg>
          <span className="text-xl font-semibold tracking-tight text-slate-900">sustable</span>
        </span>
        <p className="mb-6 mt-2 text-sm text-slate-500">Bitte anmelden</p>
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-Mail">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </Field>
          <Field label="Passwort">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Anmelden…" : "Anmelden"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
