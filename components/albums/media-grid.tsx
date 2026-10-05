"use client";

import { useEffect, useState } from "react";
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [coverPendingId, setCoverPendingId] = useState<string | null>(null);
  const [captionEditingId, setCaptionEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [gridError, setGridError] = useState<string | null>(null);
  const router = useRouter();

  // `useState(media)` solo usa `media` como valor INICIAL — si el
  // servidor manda una lista nueva (por ejemplo, tras subir más fotos
  // y hacer router.refresh()), React no lo recoge solo porque este
  // componente ya estaba montado. Sin esto, la cuadrícula se quedaba
  // "congelada" con la lista de la primera carga, y acciones sobre
  // fotos subidas después (como ponerlas de portada) fallaban porque
  // el id ya no coincidía con lo que el servidor esperaba ver.
  useEffect(() => {
    setItems(media);
  }, [media]);

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

  /**
   * Reordenar arrastrando y soltando (spec: "mover las fotos a gusto
   * del cliente, que sea interactivo"). Las flechas ↑↓ se mantienen —
   * son el único modo accesible desde el teclado y en pantallas
   * táctiles pequeñas donde arrastrar es más difícil.
   */
  function handleDrop(targetId: string) {
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }
    setItems((prev) => {
      const fromIndex = prev.findIndex((i) => i.id === draggedId);
      const toIndex = prev.findIndex((i) => i.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      reorderMedia(next.map((item, i) => ({ id: item.id, sort_order: i })));
      return next;
    });
    setDraggedId(null);
  }

  async function handleDelete(mediaId: string) {
    if (!confirm("¿Eliminar este archivo? No se puede deshacer.")) return;
    setItems((prev) => prev.filter((i) => i.id !== mediaId));
    await deleteMedia(albumId, mediaId);
    router.refresh();
  }

  async function handleSetCover(mediaId: string) {
    setGridError(null);
    setCoverPendingId(mediaId);
    const result = await setCoverMedia(albumId, mediaId);
    setCoverPendingId(null);
    if (result?.error) {
      setGridError(result.error);
      return;
    }
    router.refresh();
  }

  // Antes se usaba window.prompt() para la descripción: además de poco
  // intuitivo, en algunos navegadores integrados (apps instaladas como
  // PWA, webviews de otras apps) prompt() no funciona en absoluto y no
  // pasa nada al escribir — encaja con el bug reportado ("lo pongo y no
  // pone nada"). Ahora es un campo de texto normal, en la propia tarjeta.
  function openCaptionEditor(mediaId: string, current: string | null) {
    setCaptionEditingId(mediaId);
    setCaptionDraft(current ?? "");
  }

  function saveCaption(mediaId: string) {
    const value = captionDraft.trim();
    setItems((prev) => prev.map((i) => (i.id === mediaId ? { ...i, caption: value || null } : i)));
    setCaptionEditingId(null);
    updateMediaCaption(mediaId, value).then((result) => {
      if (result?.error) setGridError(result.error);
    });
  }

  return (
    <>
      <p className="mb-2 text-xs text-ink-500">
        Arrastra una foto o vídeo para cambiar su orden, o usa las flechas al pasar el ratón.
      </p>
      {gridError && (
        <p className="mb-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{gridError}</p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragOverId !== item.id) setDragOverId(item.id);
            }}
            onDragLeave={() => setDragOverId((prev) => (prev === item.id ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(item.id);
            }}
            onDragEnd={() => {
              setDraggedId(null);
              setDragOverId(null);
            }}
            className={cn(
              "group relative aspect-square cursor-grab overflow-hidden rounded-xl border bg-ink-50 transition active:cursor-grabbing",
              dragOverId === item.id && draggedId !== item.id ? "border-amber-500 ring-2 ring-amber-500/40" : "border-ink-100",
              draggedId === item.id && "opacity-40"
            )}
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
                  <IconButton
                    onClick={() => handleSetCover(item.id)}
                    label="Usar como portada"
                    active={item.id === coverMediaId}
                    busy={coverPendingId === item.id}
                  >
                    <Star className={cn("h-3.5 w-3.5", item.id === coverMediaId && "fill-current")} />
                  </IconButton>
                )}
                <IconButton onClick={() => openCaptionEditor(item.id, item.caption)} label="Añadir descripción">
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton onClick={() => handleDelete(item.id)} label="Eliminar">
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>

            {item.caption && captionEditingId !== item.id && (
              <p className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-[11px] text-white">
                {item.caption}
              </p>
            )}

            {captionEditingId === item.id && (
              <div
                className="absolute inset-0 z-10 flex flex-col justify-end bg-black/70 p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <textarea
                  autoFocus
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      saveCaption(item.id);
                    }
                    if (e.key === "Escape") setCaptionEditingId(null);
                  }}
                  placeholder="Descripción de esta foto (opcional)"
                  className="mb-1.5 w-full resize-none rounded-md border-0 bg-white/95 p-1.5 text-xs text-ink-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  rows={2}
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCaptionEditingId(null)}
                    className="rounded-md bg-white/20 px-2 py-1 text-[11px] text-white hover:bg-white/30"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => saveCaption(item.id)}
                    className="rounded-md bg-amber-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-amber-600"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            )}
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
  active,
  busy,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className={cn(
        "rounded-md p-1 hover:bg-white focus-ring disabled:opacity-50",
        active ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-white/90 text-ink-900"
      )}
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
