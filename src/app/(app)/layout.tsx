import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { canAccessPage } from "@/lib/permissions";
import { AppShell, type Role } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Rollenbasierter Routenschutz (Pfad aus der Middleware; frische DB-Rolle)
  const pathname = headers().get("x-pathname") ?? "/";
  if (!canAccessPage(user.role, pathname)) redirect("/403");

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role as Role }}
    >
      {children}
    </AppShell>
  );
}
