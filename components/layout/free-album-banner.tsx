"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, X } from "lucide-react";

const COOKIE_NAME = "dismissed_free_album_banner";

/**
 * Barra fija visible en toda la web (spec: "el usuario no se entera de
 * que tiene un álbum gratis"), no solo en la portada. Se cierra con la
 * X y se recuerda con una cookie — y el servidor (en SiteHeader) ya
 * decide de antemano si merece la pena mostrarla (si el usuario sigue
 * teniendo el álbum gratis disponible).
 */
export function FreeAlbumBanner({ ctaHref }: { ctaHref: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE_NAME}=`));
    setVisible(!dismissed);
  }, []);

  function dismiss() {
    document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${60 * 60 * 24 * 365}`;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
      <Gift className="h-4 w-4 flex-shrink-0" />
      <span>
        Tu primer álbum es <strong>gratis, para siempre</strong>.{" "}
        <Link href={ctaHref} className="underline underline-offset-2 hover:no-underline">
          Crear mi álbum gratis
        </Link>
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="flex-shrink-0 rounded-full p-1 hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
