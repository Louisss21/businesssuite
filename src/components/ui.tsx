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

const BADGE_COLORS: Record<string, string> = {
  // Lead
  NEW: "bg-slate-100 text-slate-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  QUALIFIED: "bg-violet-100 text-violet-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  // Order
  DRAFT: "bg-slate-100 text-slate-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  // Invoice
  OPEN: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={cx(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        BADGE_COLORS[value] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {value}
    </span>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">{children}</table>
    </Card>
  );
}

export function Th({ children, className }: ComponentProps<"th">) {
  return (
    <th
      className={cx(
        "border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500",
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
