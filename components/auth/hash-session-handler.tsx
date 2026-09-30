"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { completeSessionFromTokens } from "@/lib/actions/auth";

/**
 * Lee `window.location.hash` (spec #3): cuando Supabase usa el flujo
 * "implícito" para el enlace de verificación, los tokens de sesión
 * llegan como `#access_token=...&refresh_token=...` en el propio
 * navegador — nunca en la petición al servidor. Solo el navegador
 * puede leerlos, por eso esto tiene que ser un componente cliente.
 */
export function HashSessionHandler({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setError("Este enlace de verificación no es válido o ha caducado.");
      return;
    }

    completeSessionFromTokens(accessToken, refreshToken).then((result) => {
      // Limpiamos el fragmento de la URL para que los tokens no se
      // queden visibles en el historial del navegador.
      window.history.replaceState(null, "", window.location.pathname);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      const destination = result.nfc && next === "/onboarding" ? `${next}?nfc=${encodeURIComponent(result.nfc)}` : next;
      const finalUrl = destination === "/onboarding" || destination.startsWith("/albumes/nuevo") || destination.startsWith("/actualizar-password")
        ? destination
        : `/correo-verificado${result.nfc ? `?nfc=${encodeURIComponent(result.nfc)}` : ""}`;
      router.replace(finalUrl);
    });
  }, [next, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
            <TriangleAlert className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-display text-lg font-semibold text-ink-900">Enlace no válido</h1>
          <p className="text-sm text-ink-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream-100 px-4 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      <p className="text-sm text-ink-500">Confirmando tu correo…</p>
    </div>
  );
}
