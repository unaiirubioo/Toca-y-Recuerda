import type { Metadata } from "next";
import { listUsers } from "@/lib/queries/admin-users";
import { UsersTable } from "@/components/admin/users-table";

export const metadata: Metadata = { title: "Usuarios · Admin" };

export default async function AdminUsersPage() {
  const users = await listUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900">Usuarios</h1>
        <p className="text-sm text-ink-500">{users.length} usuarios registrados.</p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
