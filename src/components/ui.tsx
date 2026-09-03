import Link from "next/link";
import { ComponentProps } from "react";

/** Kleine, wiederverwendbare UI-Primitives (bewusst schlank gehalten). */

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ className, ...p }: ComponentProps<"div">) {
  return (
    <div
      className={cx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}
      {...p}
    />
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  variant = "primary",
  className,
  ...p
}: ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    ghost: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50",
        styles,
        className,
      )}
      {...p}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-brand-600 text-white hover:bg-brand-700"
      : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50";
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center rounded-lg px-3.5 py-2 text-sm font-medium transition",
        styles,
      )}
    >
      {children}
    </Link>
  );
}

export function Input({ className, ...p }: ComponentProps<"input">) {
  return (
    <input
      className={cx(
        "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className,
      )}
      {...p}
    />
  );
}

export function Select({ className, ...p }: ComponentProps<"select">) {
  return (
    <select
      className={cx(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
        className,
      )}
      {...p}
    />
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

/**
 * Sustable-Status: einzelne Akzentfarbe + dezenter rgba-Hintergrund derselben
 * Farbe, Label in Geist Mono (uppercase). Status-Codes bleiben unverändert.
 */
const GREEN = "var(--st-green)";
const ORANGE = "var(--st-orange)";
const BLUE = "var(--st-blue)";
const CYAN = "var(--st-cyan)";
const VIOLET = "var(--st-violet)";
const RED = "var(--st-red)";
const GREY = "var(--st-grey)";

export const BADGE_COLORS: Record<string, string> = {
  // Lead – jeder Status ein eigener Farbton (beim Scrollen unterscheidbar).
  // Die Kontakt-Stufen steigern sich blau -> cyan -> orange (Nachhaken).
  NEW: GREY,
  CONTACTED: BLUE,
  CONTACTED_2: CYAN,
  CONTACTED_3: ORANGE,
  QUALIFIED: VIOLET,
  WON: GREEN,
  LOST: RED,
  // Order
  DRAFT: GREY,
  CONFIRMED: ORANGE,
  IN_PROGRESS: ORANGE,
  COMPLETED: GREEN,
  CANCELLED: GREY, // Order- & Invoice-Storno
  // Invoice
  OPEN: ORANGE,
  PAID: GREEN,
  OVERDUE: RED,
};

/**
 * Status-Pille. `value` bestimmt die Farbe (Status-Code), `label` optional den
 * angezeigten Text – so bleibt die Farbe korrekt, wenn ein deutscher
 * Anzeigename statt des Codes ausgegeben wird.
 */
export function Badge({ value, label }: { value: string; label?: string }) {
  const color = BADGE_COLORS[value] ?? GREY;
  return (
    <span
      className="status-pill inline-flex items-center rounded-badge px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider"
      style={{ "--sc": color } as React.CSSProperties}
    >
      {label ?? value}
    </span>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  // overflow-x-auto: auf kleinen Screens horizontal scrollbar statt Layout-Bruch
  return (
    <Card className="overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">{children}</table>
      </div>
    </Card>
  );
}

export function Th({ children, className }: ComponentProps<"th">) {
  return (
    <th
      className={cx(
        "border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: ComponentProps<"td">) {
  return (
    <td className={cx("border-b border-slate-100 px-4 py-3 align-middle", className)}>
      {children}
    </td>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-400">{children}</div>;
}
