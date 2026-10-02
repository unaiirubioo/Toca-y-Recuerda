"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { assignCollageSpans, type CollageSpan } from "@/lib/business/smart-collage";

type Item = { id: string; type: "photo" | "video"; url: string; thumbnailUrl: string };

export function ViewerGallery({ items }: { items: Item[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [spans, setSpans] = useState<CollageSpan[] | null>(null);

  // Collage organizado con IA "de forma": no analiza el contenido de
  // las fotos (eso necesitaría una IA con visión, con coste), pero sí
  // mide la forma real de cada imagen — panorámica, vertical o
  // cuadrada — para maquetarlas con ritmo, como haría alguien a mano
  // con un álbum de papel, en vez de una cuadrícula uniforme y plana.
  useEffect(() => {
    let cancelled = false;

    Promise.all(
      items.map(
        (item) =>
          new Promise<number | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img.naturalWidth / img.naturalHeight);
            img.onerror = () => resolve(null);
            img.src = item.thumbnailUrl;
          })
      )
    ).then((ratios) => {
      if (!cancelled) setSpans(assignCollageSpans(ratios));
    });

    return () => {
      cancelled = true;
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid auto-rows-[110px] grid-cols-2 gap-2 sm:grid-cols-3 sm:auto-rows-[140px] lg:grid-cols-4 lg:auto-rows-[160px]">
        {items.map((item, i) => {
          const span = spans?.[i];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative overflow-hidden rounded-xl bg-ink-50 transition-all focus-ring",
                span?.colSpan === 2 && "col-span-2",
                span?.rowSpan === 2 && "row-span-2"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              {item.type === "video" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-xl text-white">
                  ▶
                </span>
              )}
            </button>
          );
        })}
      </div>

      {index !== null && (
        <Lightbox items={items} index={index} onClose={() => setIndex(null)} onNavigate={setIndex} />
      )}
    </>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: Item[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}) {
  const item = items[index];
  const [zoomed, setZoomed] = useState(false);

  // Con noUncheckedIndexedAccess, TS trata items[index] como
  // "Item | undefined" aunque en la práctica index siempre venga
  // dentro de rango (lo controla quien abre el lightbox). Esta guarda
  // es solo para satisfacer al compilador de forma segura.
  if (!item) return null;

  // Se monta con un portal directamente en <body> (spec #12: antes el
  // lightbox se quedaba "atrapado" dentro de la tarjeta del álbum en
  // vez de cubrir toda la pantalla — típico efecto de CSS cuando un
  // antepasado tiene una transformación aplicada, que convierte
  // `position: fixed` en relativo a ESE antepasado en lugar de a la
  // ventana. Renderizarlo en <body> evita el problema de raíz, venga
  // de donde venga esa transformación).
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 p-4">
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
      <div className="relative max-h-full max-w-full">
        {item.type === "photo" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt=""
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
    </div>,
    document.body
  );
}
