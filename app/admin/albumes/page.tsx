import type { Metadata } from "next";
import { listAllAlbums } from "@/lib/queries/admin-albums";
import { AdminAlbumsTable } from "@/components/admin/admin-albums-table";

export const metadata: Metadata = { title: "Álbumes · Admin" };

export default async function AdminAlbumsPage() {
  const albums = await listAllAlbums();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900">Álbumes</h1>
        <p className="text-sm text-ink-500">{albums.length} álbumes en toda la plataforma.</p>
      </div>
      <AdminAlbumsTable albums={albums} />
    </div>
  );
}
