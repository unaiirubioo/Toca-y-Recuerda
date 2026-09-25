import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export default function AccountBlockedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 text-center">
      <div className="max-w-sm">
        <div className="mb-4 text-4xl">🔒</div>
        <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">
          Tu cuenta está temporalmente bloqueada
        </h1>
        <p className="mb-6 text-ink-500">
          Si crees que esto es un error, contacta con nuestro equipo de soporte.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
