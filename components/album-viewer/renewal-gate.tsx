import Link from "next/link";
import { Clock3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Pantalla de bloqueo cuando ha vencido la conservación de 5 años
 * (spec #10). Discreta a propósito — no es un muro agresivo, es un
 * aviso claro con un único botón para resolverlo.
 */
export function RenewalGate({ albumId, title, isOwner }: { albumId: string; title: string; isOwner: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
          <Clock3 className="h-7 w-7" />
        </div>
        <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">"{title}" necesita renovarse</h1>
        <p className="mb-6 text-sm text-ink-500">
          Mantenemos cada recuerdo guardado 5 años. Ese plazo ya ha pasado para este álbum — renuévalo
          para seguir viéndolo y que no se elimine.
        </p>

        {isOwner ? (
          <Link href={`/album/renovar/${albumId}`} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Renovar este álbum
          </Link>
        ) : (
          <p className="text-sm text-ink-500">Pide a la persona que lo creó que lo renueve para poder verlo.</p>
        )}
      </div>
    </main>
  );
}
