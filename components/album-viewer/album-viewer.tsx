import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { PublicAlbum } from "@/lib/queries/public-album";
import { ViewerGallery } from "@/components/album-viewer/viewer-gallery";

const AlbumMap = dynamic(() => import("@/components/album-viewer/album-map").then((m) => m.AlbumMap), {
  ssr: false,
  loading: () => <div className="h-[280px] rounded-2xl bg-ink-50" />,
});

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const fmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });
  const startText = fmt.format(new Date(start));
  if (!end || end === start) return startText;
  return `${startText} — ${fmt.format(new Date(end))}`;
}

export function AlbumViewer({ album }: { album: PublicAlbum }) {
  const dateText = formatDateRange(album.eventDateStart, album.eventDateEnd);
  const hasMap = album.locationLat != null && album.locationLng != null;

  return (
    <main className="min-h-screen bg-cream-100">
      {/* Portada grande */}
      <div className="relative flex h-[60vh] min-h-[360px] items-end justify-center overflow-hidden bg-ink-900">
        {album.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-ink-700 to-ink-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="relative z-10 px-6 pb-10 text-center text-white">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">{album.title}</h1>
          {dateText && <p className="mt-2 text-sm text-white/80">{dateText}</p>}
          {album.locationName && (
            <p className="mt-1 flex items-center justify-center gap-1 text-sm text-white/80">
              <MapPin className="h-4 w-4" /> {album.locationName}
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-10 px-4 py-12">
        {album.media.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">Galería</h2>
            <ViewerGallery items={album.media} />
          </section>
        )}

        {album.memories.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">La historia</h2>
            <div className="space-y-4 whitespace-pre-line rounded-2xl bg-white p-6 text-ink-700 shadow-soft">
              {album.memories.join("\n\n")}
            </div>
          </section>
        )}

        {hasMap && (
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">Dónde ocurrió</h2>
            <AlbumMap lat={album.locationLat!} lng={album.locationLng!} />
          </section>
        )}

        {album.musicUrl && (
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">
              {album.musicTitle || "Música"}
            </h2>
            <audio controls src={album.musicUrl} className="w-full" />
          </section>
        )}
      </div>
    </main>
  );
}
