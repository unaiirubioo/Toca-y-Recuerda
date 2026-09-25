import Link from "next/link";
import { getOrderByCheckoutSession } from "@/lib/queries/orders";
import { ClearCartOnMount } from "@/components/store/clear-cart-on-mount";
import { buttonVariants } from "@/components/ui/button";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const order = session_id ? await getOrderByCheckoutSession(session_id) : null;

  const hasAlbumCredits = order?.items.some((i) => i.albumCredits > 0) ?? false;
  const hasNfc = order?.items.some((i) => i.nfcCredits > 0) ?? false;
  // El webhook puede tardar un instante más que la redirección del navegador;
  // si todavía no vemos "paid", mostramos un mensaje igualmente tranquilizador.
  const stillProcessing = order?.status !== "paid";

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 text-center">
      <ClearCartOnMount />
      <div className="max-w-sm">
        <div className="mb-4 text-5xl">🎉</div>
        <h1 className="mb-3 font-display text-2xl font-semibold text-ink-900">¡Listo!</h1>

        {stillProcessing ? (
          <p className="mb-6 text-ink-500">
            Estamos confirmando tu pago — tardará solo unos segundos. Puedes
            seguir navegando mientras tanto.
          </p>
        ) : (
          <div className="mb-6 space-y-2 text-ink-500">
            {hasAlbumCredits && <p>Ya puedes empezar a crear tu recuerdo.</p>}
            {hasNfc && <p>Prepararemos tu NFC y te lo enviaremos.</p>}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {hasAlbumCredits && (
            <Link href="/albumes/nuevo" className={buttonVariants()}>
              Crear mi recuerdo
            </Link>
          )}
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
            Ir a mi panel
          </Link>
        </div>
      </div>
    </main>
  );
}
