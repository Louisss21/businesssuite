import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppShell, type Role } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role as Role }}
    >
      {children}
    </AppShell>
  );
}
