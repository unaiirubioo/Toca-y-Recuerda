import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LogOut, Images, Gift, Package, Nfc as NfcIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAvailableCredits, getUserAlbums, getAlbumAvailabilityStatus } from "@/lib/queries/albums";
import { getMyOrders } from "@/lib/queries/my-account";
import { getAlbumOnlyCreditsPurchased, getMySelfNfcTags } from "@/lib/queries/self-nfc";
import { computeSelfNfcQuota } from "@/lib/business/self-nfc-quota";
import { signOut } from "@/lib/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EditNameForm } from "@/components/account/edit-name-form";
import { MyNfcPanel } from "@/components/account/my-nfc-panel";
import { AlbumAvailabilityBadge } from "@/components/account/album-availability-status";
import { SiteHeader } from "@/components/layout/site-header";
import { formatEuros } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi cuenta" };

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente de pago",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

const ORDER_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  pending: "warning",
  paid: "success",
  failed: "danger",
  refunded: "neutral",
};

export default async function MyAccountPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userData.user.id)
    .single();

  const [credits, albums, orders, albumOnlyCredits, selfNfcTags, availability] = await Promise.all([
    getAvailableCredits(userData.user.id),
    getUserAlbums(userData.user.id),
    getMyOrders(userData.user.id),
    getAlbumOnlyCreditsPurchased(userData.user.id),
    getMySelfNfcTags(userData.user.id),
    getAlbumAvailabilityStatus(userData.user.id),
  ]);
  const selfNfcQuota = computeSelfNfcQuota({ albumOnlyCreditsPurchased: albumOnlyCredits });

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream-100 pb-16">
        {/* Cabecera con degradado — da identidad a la página en vez de
            empezar en seco con una tarjeta blanca sobre fondo blanco. */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 px-4 pb-16 pt-10">
          <div className="mx-auto max-w-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-white font-display text-2xl font-semibold text-amber-600 shadow-card">
                  {((profile as any)?.full_name ?? userData.user.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="font-display text-xl font-semibold text-white sm:text-2xl">
                    {(profile as any)?.full_name ?? "Sin nombre"}
                  </h1>
                  <p className="text-sm text-amber-50">{userData.user.email}</p>
                  <div className="mt-1 [&_button]:text-amber-50 [&_button]:hover:text-white">
                    <EditNameForm initialName={(profile as any)?.full_name ?? ""} />
                  </div>
                </div>
              </div>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "flex-shrink-0 bg-white text-amber-700 hover:bg-amber-50"
                )}
              >
                <Images className="h-4 w-4" />
                Ir a mis recuerdos
              </Link>
            </div>
          </div>
        </div>

        {/* Las tarjetas se superponen a la cabecera (-mt) para que no
            se sienta como dos bloques pegados sin más. */}
        <div className="mx-auto -mt-10 max-w-2xl space-y-5 px-4">
          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink-900">
              <Gift className="h-4 w-4 text-amber-600" /> Disponible para ti
            </h2>
            <div className="mb-4">
              <AlbumAvailabilityBadge status={availability} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-cream-100 py-3">
                <p className="font-display text-2xl font-semibold text-ink-900">{albums.length}</p>
                <p className="text-xs text-ink-500">Álbumes creados</p>
              </div>
              <div className="rounded-xl bg-cream-100 py-3">
                <p className="font-display text-2xl font-semibold text-ink-900">{credits.albumCredits}</p>
                <p className="text-xs text-ink-500">Premium por crear</p>
              </div>
              <div className="rounded-xl bg-cream-100 py-3">
                <p className="font-display text-2xl font-semibold text-ink-900">{credits.nfcCredits}</p>
                <p className="text-xs text-ink-500">NFC sin asociar</p>
              </div>
            </div>
            {credits.albumCredits === 0 && credits.nfcCredits === 0 && (
              <Link href="/tienda" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
                Ver la tienda
              </Link>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink-900">
              <Package className="h-4 w-4 text-amber-600" /> Mis pedidos ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <p className="text-sm text-ink-500">Todavía no has comprado nada.</p>
            ) : (
              <ul className="space-y-3">
                {orders.map((o) => (
                  <li key={o.id} className="border-b border-ink-50 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-ink-500">
                        {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(o.createdAt))}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={ORDER_STATUS_VARIANT[o.status] ?? "neutral"}>
                          {ORDER_STATUS_LABELS[o.status] ?? o.status}
                        </Badge>
                        <span className="font-medium text-ink-900">{formatEuros(o.totalCents)}</span>
                      </div>
                    </div>
                    <ul className="mt-1 text-sm text-ink-700">
                      {o.products.map((p, i) => (
                        <li key={i}>
                          {p.quantity}× {p.name}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-ink-900">
              <NfcIcon className="h-4 w-4 text-amber-600" /> Tu propio NFC
            </h2>
            <MyNfcPanel initialTags={selfNfcTags} quota={selfNfcQuota} bare />
          </section>

          <form action={signOut} className="pt-2 text-center">
            <Button type="submit" variant="ghost" size="sm" className="text-ink-500">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
