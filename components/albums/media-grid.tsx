"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { AlbumMediaItem } from "@/lib/queries/media";
import { deleteMedia, setCoverMedia, reorderMedia, updateMediaCaption } from "@/lib/actions/media";
import { cn } from "@/lib/utils";

export function MediaGrid({
  albumId,
  media,
  coverMediaId,
}: {
  albumId: string;
  media: AlbumMediaItem[];
  coverMediaId: string | null;
}) {
  const [items, setItems] = useState(media);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const router = useRouter();

  if (items.length === 0) {
    return <p className="text-sm text-ink-500">Todavía no has añadido fotos ni vídeos.</p>;
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return; // en la práctica siempre existen; guarda solo para TS estricto
    next[index] = b;
    next[target] = a;
    setItems(next);
    reorderMedia(next.map((item, i) => ({ id: item.id, sort_order: i })));
  }

  async function handleDelete(mediaId: string) {
    if (!confirm("¿Eliminar este archivo? No se puede deshacer.")) return;
    setItems((prev) => prev.filter((i) => i.id !== mediaId));
    await deleteMedia(albumId, mediaId);
    router.refresh();
  }

  async function handleSetCover(mediaId: string) {
    await setCoverMedia(albumId, mediaId);
    router.refresh();
  }

  function handleEditCaption(mediaId: string, current: string | null) {
    const next = window.prompt("Descripción de esta foto (opcional):", current ?? "");
    if (next === null) return; // cancelado
    setItems((prev) => prev.map((i) => (i.id === mediaId ? { ...i, caption: next.trim() || null } : i)));
    updateMediaCaption(mediaId, next);
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-ink-100 bg-ink-50"
          >
            <button
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="absolute inset-0 h-full w-full focus-ring"
              aria-label="Ver a pantalla completa"
            >
              {item.type === "photo" ? (
                <Image src={item.thumbnailUrl} alt={item.fileName} fill className="object-cover" unoptimized />
              ) : (
                <>
                  <Image src={item.thumbnailUrl} alt={item.fileName} fill className="object-cover" unoptimized />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-2xl text-white">
                    ▶
                  </span>
                </>
              )}
            </button>

            {item.id === coverMediaId && (
              <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white">
                Portada
              </span>
            )}

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
              <div className="flex gap-0.5">
                <IconButton onClick={() => move(index, -1)} label="Mover antes">
                  <ChevronUp className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton onClick={() => move(index, 1)} label="Mover después">
                  <ChevronDown className="h-3.5 w-3.5" />
                </IconButton>
              </div>
              <div className="flex gap-0.5">
                {item.type === "photo" && (
                  <IconButton onClick={() => handleSetCover(item.id)} label="Usar como portada">
                    <Star className="h-3.5 w-3.5" />
                  </IconButton>
                )}
                <IconButton onClick={() => handleEditCaption(item.id, item.caption)} label="Añadir descripción">
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton onClick={() => handleDelete(item.id)} label="Eliminar">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

function IconButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-md bg-white/90 p-1 text-ink-900 hover:bg-white focus-ring"
    >
      {children}
    </button>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: AlbumMediaItem[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const item = items[index];
  const [zoomed, setZoomed] = useState(false);

  // Con noUncheckedIndexedAccess, TS trata items[index] como
  // "AlbumMediaItem | undefined" aunque en la práctica index siempre
  // venga dentro de rango (lo controla quien abre el lightbox). Esta
  // guarda es solo para satisfacer al compilador de forma segura.
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus-ring"
        aria-label="Cerrar"
      >
        <X className="h-6 w-6" />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={() => onNavigate(index - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus-ring"
          aria-label="Anterior"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      )}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={() => onNavigate(index + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus-ring"
          aria-label="Siguiente"
        >
          <ArrowRight className="h-6 w-6" />
        </button>
      )}

      <div className="flex max-h-full max-w-full flex-col items-center gap-3">
        <div className="relative max-h-full max-w-full">
          {item.type === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.fileName}
              onClick={() => setZoomed((z) => !z)}
              className={cn(
                "max-h-[85vh] max-w-full cursor-zoom-in rounded-lg transition-transform",
                zoomed && "max-h-none max-w-none scale-150 cursor-zoom-out"
              )}
            />
          ) : (
            <video src={item.url} controls autoPlay className="max-h-[85vh] max-w-full rounded-lg" />
          )}
        </div>
        {item.caption && <p className="max-w-md text-center text-sm text-white/80">{item.caption}</p>}
      </div>
    </div>
  );
}
