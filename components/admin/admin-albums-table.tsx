"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StorageUsage } from "@/components/ui/storage-usage";
import type { AdminAlbumRow } from "@/lib/queries/admin-albums";

export function AdminAlbumsTable({ albums }: { albums: AdminAlbumRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return albums;
    return albums.filter(
      (a) => a.title.toLowerCase().includes(q) || a.ownerName?.toLowerCase().includes(q)
    );
  }, [query, albums]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
        <Input
          placeholder="Buscar por título o propietario…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
              <th className="px-4 py-3">Álbum</th>
              <th className="px-4 py-3">Propietario</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Almacenamiento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-ink-50 last:border-0">
                <td className="px-4 py-3 font-medium text-ink-900">{a.title}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/usuarios/${a.ownerId}`} className="text-ink-700 hover:underline">
                    {a.ownerName ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={a.isPremium ? "premium" : "neutral"}>
                    {a.isPremium ? "Premium" : "Gratis"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{a.status === "published" ? "Publicado" : "Borrador"}</Badge>
                </td>
                <td className="px-4 py-3 w-40">
                  <StorageUsage usedMb={a.storageUsedMb} limitMb={a.storageLimitMb} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
