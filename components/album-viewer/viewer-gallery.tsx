"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: string; type: "photo" | "video"; url: string; thumbnailUrl: string };

export function ViewerGallery({ items }: { items: Item[] }) {
  const [index, setIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setIndex(i)}
            className="relative aspect-square overflow-hidden rounded-xl bg-ink-50 focus-ring"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            {item.type === "video" && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/20 text-xl text-white">
                ▶
              </span>
            )}
          </button>
        ))}
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
    </div>
  );
}
