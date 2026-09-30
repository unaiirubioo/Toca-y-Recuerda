import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cuenta bloqueada" };

export default function CuentaBloqueadaPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/15 text-danger">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">Tu cuenta está bloqueada</h1>
        <p className="mb-8 text-sm text-ink-500">
          Un administrador ha restringido temporalmente el acceso a esta cuenta. Si crees que es un error,
          contacta con nosotros.
        </p>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Ir a la página principal
        </Link>
      </div>
    </main>
  );
}
