"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Se registra en la consola del servidor/proveedor de logs — nunca
    // se muestra el stack técnico a quien usa la plataforma (spec #41).
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 text-center">
      <div className="max-w-sm">
        <div className="mb-4 text-5xl">😕</div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">
          Ups, algo ha ido mal
        </h1>
        <p className="mb-6 text-ink-500">
          No ha sido culpa tuya. Ya lo hemos anotado — inténtalo otra vez en un momento.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Reintentar</Button>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
            Ir a mi panel
          </Link>
        </div>
      </div>
    </main>
  );
}
