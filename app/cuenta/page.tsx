import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAvailableCredits, getUserAlbums } from "@/lib/queries/albums";
import { getMyOrders } from "@/lib/queries/my-account";
import { signOut } from "@/lib/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EditNameForm } from "@/components/account/edit-name-form";
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

  const [credits, albums, orders] = await Promise.all([
    getAvailableCredits(userData.user.id),
    getUserAlbums(userData.user.id),
    getMyOrders(userData.user.id),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">Mi cuenta</h1>
            <p className="text-sm text-ink-500">
              {(profile as any)?.full_name ?? "Sin nombre"} · {userData.user.email}
            </p>
            <div className="mt-1">
              <EditNameForm initialName={(profile as any)?.full_name ?? ""} />
            </div>
          </div>
          <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Ir a mis recuerdos
          </Link>
        </div>

        <section className="rounded-2xl bg-white p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold text-ink-900">Disponible para ti</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="font-display text-2xl font-semibold text-ink-900">{albums.length}</p>
              <p className="text-xs text-ink-500">Álbumes creados</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-ink-900">{credits.albumCredits}</p>
              <p className="text-xs text-ink-500">Álbumes Premium por crear</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-ink-900">{credits.nfcCredits}</p>
              <p className="text-xs text-ink-500">NFC pendientes de asociar</p>
            </div>
          </div>
          {credits.albumCredits === 0 && credits.nfcCredits === 0 && (
            <Link href="/tienda" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
              Ver la tienda
            </Link>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold text-ink-900">
            Mis pedidos ({orders.length})
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

        <form action={signOut}>
          <Button type="submit" variant="outline">
            Cerrar sesión
          </Button>
        </form>
      </div>
      </main>
    </>
  );
}
