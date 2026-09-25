import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function NfcNotConfigured({ token }: { token: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 text-center">
      <div className="max-w-sm">
        <div className="mb-4 text-4xl">✨</div>
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink-900">
          Este recuerdo todavía no está configurado
        </h1>
        <p className="mb-8 text-ink-500">Vamos a convertirlo en algo especial.</p>
        <Link
          href={`/registro?nfc=${encodeURIComponent(token)}`}
          className={buttonVariants({ size: "lg" })}
        >
          Crear mi álbum
        </Link>
        <p className="mt-4 text-sm text-ink-500">
          ¿Ya tienes cuenta?{" "}
          <Link href={`/login?nfc=${encodeURIComponent(token)}`} className="font-medium text-ink-900 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
