import Link from "next/link";
import { Camera, Film, Nfc } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StorageUsage } from "@/components/ui/storage-usage";
import type { DashboardAlbum } from "@/lib/queries/albums";

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(dateStr)
  );
}

export function AlbumCard({ album }: { album: DashboardAlbum }) {
  const date = formatDate(album.event_date_start);

  return (
    <Link
      href={`/albumes/${album.id}/editar`}
      className="group block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-soft transition hover:shadow-card focus-ring"
    >
      {/* La portada real (Storage) llega en la Fase 5; de momento, placeholder de marca. */}
      <div className="flex h-36 items-center justify-center bg-ink-50">
        <span className="text-3xl opacity-40">📸</span>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-base font-semibold text-ink-900">
            {album.title}
          </h3>
          <Badge variant={album.is_premium ? "premium" : "neutral"}>
            {album.is_premium ? "Premium" : "Gratis"}
          </Badge>
        </div>

        {date && <p className="text-sm text-ink-500">{date}</p>}

        <div className="flex items-center gap-4 text-sm text-ink-500">
          <span className="flex items-center gap-1">
            <Camera className="h-4 w-4" /> {album.photo_count}
          </span>
          <span className="flex items-center gap-1">
            <Film className="h-4 w-4" /> {album.video_count}
          </span>
          {album.nfc_public_token && (
            <span className="flex items-center gap-1 text-ink-700">
              <Nfc className="h-4 w-4" /> Asociado
            </span>
          )}
        </div>

        <StorageUsage usedMb={album.storage_used_mb} limitMb={album.storage_limit_mb} />

        {album.status === "draft" && (
          <Badge variant="outline">Borrador — sin publicar</Badge>
        )}
      </div>
    </Link>
  );
}
