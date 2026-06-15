import Link from "next/link";

const TABS = [
  { href: "/settings", label: "Allgemein", key: "general" },
  { href: "/settings/users", label: "Benutzer", key: "users" },
];

export function SettingsTabs({ active }: { active: "general" | "users" }) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 text-sm">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={`rounded-full px-3 py-1 font-medium ${
            active === t.key
              ? "bg-brand-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
