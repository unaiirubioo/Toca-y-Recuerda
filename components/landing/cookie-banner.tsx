"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "toca-y-recuerda:cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Sin localStorage disponible: no mostramos el aviso para no bloquear la navegación.
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Ignorado.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-100 bg-white p-4 shadow-card">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-ink-700">
          Usamos cookies esenciales para que la plataforma funcione. Más
          info en nuestra{" "}
          <Link href="/legal/cookies" className="underline">
            política de cookies
          </Link>
          .
        </p>
        <Button size="sm" onClick={accept} className="flex-shrink-0">
          Entendido
        </Button>
      </div>
    </div>
  );
}
