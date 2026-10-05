"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Gift, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "toca-y-recuerda:seen-free-album-welcome";

/**
 * Ventana emergente una sola vez, en la primera visita (spec), para
 * que nadie se pierda el álbum gratis. Se recuerda con localStorage —
 * una vez cerrada o usada, no vuelve a aparecer en ese navegador.
 * `eligible` lo decide el servidor (si ya hay sesión, si todavía le
 * queda el álbum gratis disponible); si no hay sesión, siempre es
 * `true` porque todo el mundo empieza con uno gratis.
 */
export function FreeAlbumWelcomeModal({ eligible, ctaHref }: { eligible: boolean; ctaHref: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const timer = setTimeout(() => setOpen(true), 900);
        return () => clearTimeout(timer);
      }
    } catch {
      // Sin localStorage disponible: no mostramos la ventana para no romper la navegación.
    }
  }, [eligible]);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignorado.
    }
    setOpen(false);
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={close}>
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 rounded-full p-1.5 text-ink-500 hover:bg-cream-100"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
          <Gift className="h-7 w-7" />
        </div>
        <h2 className="mb-2 font-display text-xl font-semibold text-ink-900">¡Tienes un álbum gratis!</h2>
        <p className="mb-6 text-sm text-ink-500">
          Para siempre, sin letra pequeña. Guarda tu primer recuerdo digital ahora mismo, sin pagar nada.
        </p>
        <Link href={ctaHref} onClick={close} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Crear mi álbum gratis
        </Link>
      </div>
    </div>,
    document.body
  );
}
