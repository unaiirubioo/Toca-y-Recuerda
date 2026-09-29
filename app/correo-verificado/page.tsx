import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Correo verificado" };

export default async function CorreoVerificadoPage({
  searchParams,
}: {
  searchParams: Promise<{ nfc?: string }>;
}) {
  const { nfc } = await searchParams;
  const continueHref = nfc ? `/albumes/nuevo?nfc=${encodeURIComponent(nfc)}` : "/onboarding";

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">
          Tu correo se ha verificado correctamente
        </h1>
        <p className="mb-8 text-sm text-ink-500">
          Ya has iniciado sesión en Toca y Recuerda — puedes seguir con tu primer recuerdo o ir directamente a tu panel.
        </p>
        <div className="space-y-2">
          <Link href={continueHref} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Crear mi recuerdo
          </Link>
          <Link href="/" className={cn(buttonVariants({ size: "lg", variant: "ghost" }), "w-full")}>
            Ahora no, ir a la página principal
          </Link>
        </div>
      </div>
    </main>
  );
}
