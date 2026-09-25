"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setUserBlocked } from "@/lib/actions/admin-users";
import type { AdminUserRow } from "@/lib/queries/admin-users";

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [query, users]);

  function toggleBlocked(userId: string, blocked: boolean) {
    startTransition(async () => {
      await setUserBlocked(userId, blocked);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <Input
          placeholder="Buscar por nombre o email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Álbumes</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-ink-50 last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/admin/usuarios/${u.id}`} className="font-medium text-ink-900 hover:underline">
                    {u.fullName ?? "Sin nombre"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-700">{u.email}</td>
                <td className="px-4 py-3 text-ink-700">{u.albumCount}</td>
                <td className="px-4 py-3">
                  {u.role === "admin" && <Badge variant="premium">Admin</Badge>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.isBlocked ? "outline" : "success"}>
                    {u.isBlocked ? "Bloqueado" : "Activo"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => toggleBlocked(u.id, !u.isBlocked)}
                  >
                    {u.isBlocked ? "Desbloquear" : "Bloquear"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
