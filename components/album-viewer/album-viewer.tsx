import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import type { PublicAlbum } from "@/lib/queries/public-album";
import { ViewerGallery } from "@/components/album-viewer/viewer-gallery";
import { buildAiCoverImageUrl } from "@/lib/ai/cover-image";

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
  const story = album.aiStory;
  const mediaById = new Map(album.media.map((m) => [m.id, m]));

  // Portada con IA real y gratuita (spec #11): solo se usa cuando no
  // hay una foto de portada propia ya resuelta — nunca sustituye a un
  // recuerdo real, solo evita el degradado gris genérico de antes.
  const heroImageUrl =
    album.coverUrl ||
    buildAiCoverImageUrl({
      albumId: album.id,
      title: album.title,
      theme: album.designTheme,
      locationName: album.locationName,
    });

  return (
    <main className="min-h-screen bg-cream-100">
      {/* Portada — más pequeña que antes (spec): protagonismo para los recuerdos, no para la foto de arriba. */}
      <div className="relative flex h-[28vh] min-h-[200px] items-end justify-center overflow-hidden bg-ink-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
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
        {album.description && (
          <p className="-mt-4 text-center font-display text-lg italic text-ink-700 sm:text-xl">
            “{album.description}”
          </p>
        )}

        {story && story.sections.length > 0 ? (
          <>
            {story.intro && (
              <p className="-mt-4 text-center font-display text-lg italic text-ink-700 sm:text-xl">{story.intro}</p>
            )}

            {story.sections.map((section, index) => {
              // Destacados de esta sección primero (en grande), y el
              // resto de archivos del mismo momento debajo, más
              // pequeños — nada se pierde, solo se ordena por
              // importancia (spec: "momentos destacados" + "todos los
              // recuerdos" dentro de cada momento).
              const highlightItems = section.highlightMediaIds.map((id) => mediaById.get(id)).filter(Boolean) as typeof album.media;
              const restItems = section.mediaIds
                .filter((id) => !section.highlightMediaIds.includes(id))
                .map((id) => mediaById.get(id))
                .filter(Boolean) as typeof album.media;

              if (highlightItems.length === 0 && restItems.length === 0) return null;

              return (
                <section key={index}>
                  <h2 className="mb-1 font-display text-xl font-semibold text-ink-900">
                    {section.title?.trim() || `Momento ${index + 1}`}
                  </h2>
                  {section.description && <p className="mb-4 text-sm text-ink-500">{section.description}</p>}
                  {highlightItems.length > 0 && <ViewerGallery items={highlightItems} />}
                  {restItems.length > 0 && (
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {restItems.map((item) => (
                        <div key={item.id} className="aspect-square overflow-hidden rounded-lg bg-ink-50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {story.closing && (
              <p className="text-center font-display text-lg italic text-ink-700 sm:text-xl">{story.closing}</p>
            )}
          </>
        ) : (
          album.media.length > 0 && (
            <section>
              <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">Galería</h2>
              <ViewerGallery items={album.media} />
            </section>
          )
        )}

        {album.memories.length > 0 && (
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">
              {story ? "Notas" : "La historia"}
            </h2>
            <div className="space-y-4 whitespace-pre-line rounded-2xl bg-white p-6 text-ink-700 shadow-soft">
              {album.memories.join("\n\n")}
            </div>
          </section>
        )}

        {story && story.sections.length > 0 && (() => {
          // Spec #6: ninguna foto debe aparecer duplicada en la página.
          // Cada archivo ya sale exactamente una vez arriba, dentro de
          // su momento (como destacado o en la cuadrícula pequeña del
          // resto) — aquí solo deben aparecer los que, por lo que sea,
          // no quedaron asignados a ningún momento, para no perder
          // ningún archivo original sin repetir los que ya se ven.
          const shownIds = new Set(story.sections.flatMap((s) => s.mediaIds));
          const remaining = album.media.filter((m) => !shownIds.has(m.id));
          if (remaining.length === 0) return null;
          return (
            <section>
              <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">Todos los recuerdos</h2>
              <ViewerGallery items={remaining} />
            </section>
          );
        })()}

        {hasMap && (
          <section>
            <h2 className="mb-4 font-display text-xl font-semibold text-ink-900">Dónde ocurrió</h2>
            <AlbumMap lat={album.locationLat!} lng={album.locationLng!} />
          </section>
        )}

      </div>
    </main>
  );
}
