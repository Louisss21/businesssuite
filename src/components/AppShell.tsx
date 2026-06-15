"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  roles?: Role[]; // undefined = alle Rollen
}

// Rollenbasierte Sichtbarkeit. ADMIN & MEMBER (Legacy) sehen alles.
const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "▥" },
  { href: "/crm", label: "CRM / Kunden", icon: "☻", roles: ["SALES", "MARKETING"] },
  { href: "/leads", label: "Leads", icon: "✦", roles: ["SALES", "MARKETING"] },
  { href: "/quotes", label: "Angebote", icon: "✎", roles: ["SALES"] },
  { href: "/orders", label: "Bestellungen", icon: "▤", roles: ["SALES"] },
  { href: "/products", label: "Produkte", icon: "▣", roles: ["WAREHOUSE", "SALES"] },
  { href: "/invoices", label: "Rechnungen", icon: "₪", roles: ["ACCOUNTING"] },
  { href: "/billing-archive", label: "Rechnungsarchiv", icon: "🗄", roles: ["ACCOUNTING"] },
  { href: "/tasks", label: "Aufgaben", icon: "✓", roles: ["SALES", "MARKETING"] },
  { href: "/settings", label: "Einstellungen", icon: "⚙", roles: [] }, // nur ADMIN/MEMBER
  // Folgen mit dem jeweiligen Feature:
  // { href: "/campaigns", label: "Kampagnen", ... }
];

function visibleFor(role: Role): NavItem[] {
  if (role === "ADMIN" || role === "MEMBER") return NAV;
  return NAV.filter((i) => !i.roles || i.roles.includes(role));
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
        <div className="px-5 py-5 text-lg font-bold text-brand-700">Business Suite</div>
        {NavList}
        {Footer}
      </aside>

      {/* Mobile-Drawer + Overlay */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-lg font-bold text-brand-700">Business Suite</span>
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
        {/* Mobile-Topbar */}
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-1 text-slate-600 hover:bg-slate-100"
            aria-label="Menü öffnen"
          >
            <span className="text-xl">☰</span>
          </button>
          <span className="font-bold text-brand-700">Business Suite</span>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
