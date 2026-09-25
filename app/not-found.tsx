import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 text-center">
      <div>
        <div className="mb-4 text-5xl">🧭</div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">
          No hemos encontrado esta página
        </h1>
        <p className="mb-6 text-ink-500">
          Puede que el enlace esté mal escrito o que el recuerdo ya no esté aquí.
        </p>
        <Link href="/" className={cn(buttonVariants())}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
