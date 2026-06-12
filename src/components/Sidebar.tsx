"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "▥" },
  { href: "/crm", label: "CRM / Kunden", icon: "☻" },
  { href: "/leads", label: "Leads", icon: "✦" },
  { href: "/orders", label: "Bestellungen", icon: "▤" },
  { href: "/invoices", label: "Rechnungen", icon: "₪" },
  { href: "/billing-archive", label: "Rechnungsarchiv", icon: "🗄" },
  { href: "/settings", label: "Einstellungen", icon: "⚙" },
];

export function Sidebar({ user }: { user: { name: string; email: string } }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="flex w-60 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5 text-lg font-bold text-brand-700">Business Suite</div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
      <div className="border-t border-slate-200 p-3">
        <div className="px-2 text-sm font-medium text-slate-700">{user.name}</div>
        <div className="px-2 text-xs text-slate-400">{user.email}</div>
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
    </aside>
  );
}
