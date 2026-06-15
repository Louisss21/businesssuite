import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { canAccessPath } from "@/lib/access";
import { AppShell, type Role } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Rollenbasierter Routenschutz (Pfad kommt aus der Middleware)
  const pathname = headers().get("x-pathname") ?? "/";
  if (!canAccessPath(user.role, pathname)) redirect("/");

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role as Role }}
    >
      {children}
    </AppShell>
  );
}
