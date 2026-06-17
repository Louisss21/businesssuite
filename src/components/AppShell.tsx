"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchPalette } from "@/components/SearchPalette";
import { accessFor, type ModuleKey } from "@/lib/permissions";

export type Role =
  | "ADMIN"
  | "SALES"
  | "MARKETING"
  | "WAREHOUSE"
  | "ACCOUNTING"
  | "MEMBER";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  module: ModuleKey;
}

// Navigation; Sichtbarkeit kommt zentral aus lib/permissions (eine Quelle).
const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "▥", module: "dashboard" },
  { href: "/crm", label: "CRM / Kunden", icon: "☻", module: "crm" },
  { href: "/leads", label: "Leads", icon: "✦", module: "leads" },
  { href: "/quotes", label: "Angebote", icon: "✎", module: "quotes" },
  { href: "/orders", label: "Bestellungen", icon: "▤", module: "orders" },
  { href: "/products", label: "Produkte", icon: "▣", module: "products" },
  { href: "/production", label: "Produktion", icon: "⚒", module: "production" },
  { href: "/inventory", label: "Lager", icon: "▦", module: "inventory" },
  { href: "/invoices", label: "Rechnungen", icon: "₪", module: "invoices" },
  { href: "/billing-archive", label: "Rechnungsarchiv", icon: "🗄", module: "billing-archive" },
  { href: "/tasks", label: "Aufgaben", icon: "✓", module: "tasks" },
  { href: "/campaigns", label: "Kampagnen", icon: "✉", module: "campaigns" },
  { href: "/settings", label: "Einstellungen", icon: "⚙", module: "settings" },
];

function visibleFor(role: Role): NavItem[] {
  return NAV.filter((i) => accessFor(role, i.module) !== "none");
}

/** Sustable Horizon-Logo + Wortmarke. */
function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 96 96" className="h-6 w-6" aria-hidden>
        <path
          d="M 22.96 41 A 26 26 0 0 1 73.04 41"
          fill="none"
          stroke="#fff"
          strokeWidth="9"
        />
        <path
          d="M 22.96 55 A 26 26 0 0 0 73.04 55"
          fill="none"
          stroke="#fff"
          strokeWidth="9"
        />
        <rect x="12" y="43.5" width="72" height="9" fill="#F07D00" />
      </svg>
      <span className="text-base font-semibold tracking-tight text-slate-900">
        sustable
      </span>
    </span>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: Role };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = visibleFor(user.role);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const NavList = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive(item.href)
              ? "bg-brand-50 text-brand-700"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="w-4 text-center">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const Footer = (
    <div className="border-t border-slate-200 p-3">
      <div className="px-2 text-sm font-medium text-slate-700">{user.name}</div>
      <div className="truncate px-2 text-xs text-slate-400">{user.email}</div>
      <div className="px-2 text-[10px] uppercase tracking-wide text-slate-400">
        {user.role}
      </div>
      <button
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          window.location.href = "/login";
        }}
        className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-50"
      >
        Abmelden
      </button>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop-Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="px-5 py-5">
          <Logo />
        </div>
        {NavList}
        {Footer}
      </aside>

      {/* Mobile-Drawer + Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <Logo />
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Menü schließen"
              >
                ✕
              </button>
            </div>
            {NavList}
            {Footer}
          </aside>
        </div>
      )}

      {/* Hauptbereich */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar (mobil: Hamburger + Titel; immer: globale Suche) */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 backdrop-blur-[14px]"
          style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="rounded-md p-1 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label="Menü öffnen"
            >
              <span className="text-xl">☰</span>
            </button>
            <span className="md:hidden">
              <Logo />
            </span>
          </div>
          <SearchPalette />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
