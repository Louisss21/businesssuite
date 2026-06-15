import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { userService } from "@/modules/users/user.service";
import { SettingsTabs } from "../SettingsTabs";
import { UserManager } from "./UserManager";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.role !== "ADMIN" && me.role !== "MEMBER") redirect("/");

  const users = await userService.list();

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Benutzer & Rollen" />
      <SettingsTabs active="users" />
      <UserManager
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          active: u.active,
        }))}
        currentUserId={me.id}
      />
    </>
  );
}
