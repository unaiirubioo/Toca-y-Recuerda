import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getUserDetail } from "@/lib/queries/admin-users";
import { getStoreProducts } from "@/lib/queries/products";
import { getAlbumAvailabilityStatus } from "@/lib/queries/albums";
import { Badge } from "@/components/ui/badge";
import { StorageUsage } from "@/components/ui/storage-usage";
import { formatEuros } from "@/lib/format";
import { GrantProductForm } from "@/components/admin/grant-product-form";
import { RevokeGiftButton } from "@/components/admin/revoke-gift-button";
import { AlbumAvailabilityBadge } from "@/components/account/album-availability-status";

export const metadata: Metadata = { title: "Detalle de usuario · Admin" };

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, products, availability] = await Promise.all([
    getUserDetail(id),
    getStoreProducts(),
    getAlbumAvailabilityStatus(id),
  ]);
  if (!user) notFound();

  const activeOrders = user.orders.filter((o) => o.status !== "refunded");
  const revokedOrders = user.orders.filter((o) => o.status === "refunded");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/usuarios" className="text-sm text-ink-500 hover:text-ink-900">
          ← Volver a usuarios
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">
          {user.fullName ?? "Sin nombre"}
        </h1>
        <p className="text-sm text-ink-500">{user.email}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {user.role === "admin" && <Badge variant="premium">Admin</Badge>}
          <Badge variant={user.isBlocked ? "outline" : "success"}>
            {user.isBlocked ? "Bloqueado" : "Activo"}
          </Badge>
          <Badge variant={user.emailVerified ? "success" : "outline"}>
            {user.emailVerified ? "Correo verificado" : "Correo sin verificar"}
          </Badge>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold text-ink-900">Álbumes disponibles</h2>
          <AlbumAvailabilityBadge status={availability} />
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-soft">
          <h2 className="mb-3 font-display text-base font-semibold text-ink-900">NFC propio (autogenerado)</h2>
          <p className="text-sm text-ink-700">
            <span className="font-semibold">{user.selfNfcUsed}</span> de{" "}
            <span className="font-semibold">{user.selfNfcQuota}</span> generados
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {user.selfNfcUsed < user.selfNfcQuota ? "Todavía le queda cupo." : "Ha usado todo su cupo."}
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-soft">
        <h2 className="mb-3 font-display text-base font-semibold text-ink-900">Almacenamiento</h2>
        <StorageUsage usedMb={user.storageUsedMb} limitMb={user.storageLimitMb} />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-soft">
        <h2 className="mb-3 font-display text-base font-semibold text-ink-900">
          Álbumes ({user.albums.length})
        </h2>
        {user.albums.length === 0 ? (
          <p className="text-sm text-ink-500">Todavía no tiene álbumes.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {user.albums.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <span className="text-ink-900">{a.title}</span>
                <span className="flex gap-2">
                  <Badge variant={a.isPremium ? "premium" : "neutral"}>
                    {a.isPremium ? "Premium" : "Gratis"}
                  </Badge>
                  <Badge variant="outline">{a.status === "published" ? "Publicado" : "Borrador"}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-soft">
        <h2 className="mb-3 font-display text-base font-semibold text-ink-900">
          Compras ({activeOrders.length})
        </h2>
        {activeOrders.length === 0 ? (
          <p className="text-sm text-ink-500">Todavía no ha comprado nada.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {activeOrders.map((o) => (
              <li key={o.id} className="rounded-xl border border-ink-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-ink-500">
                    {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(o.createdAt))}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={o.status === "paid" ? "success" : "outline"}>{o.status}</Badge>
                    {o.isGift && <Badge variant="premium">Regalo</Badge>}
                    <span className="font-medium text-ink-900">{formatEuros(o.totalCents)}</span>
                  </div>
                </div>
                {/* spec #13: antes aparecía "Regalo" sin decir qué se había regalado */}
                <ul className="mt-1.5 text-xs text-ink-700">
                  {o.products.length === 0 ? (
                    <li className="text-ink-400">Sin productos asociados.</li>
                  ) : (
                    o.products.map((prod, i) => (
                      <li key={i}>
                        {prod.quantity}× {prod.name}
                      </li>
                    ))
                  )}
                </ul>
                {o.isGift && o.status === "paid" && (
                  <div className="mt-2">
                    <RevokeGiftButton orderId={o.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* spec #14: los regalos quitados se ven aparte, no mezclados con los activos */}
        {revokedOrders.length > 0 && (
          <div className="mt-5 border-t border-ink-100 pt-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
              Regalos quitados ({revokedOrders.length})
            </h3>
            <ul className="space-y-2 text-sm opacity-60">
              {revokedOrders.map((o) => (
                <li key={o.id} className="rounded-xl border border-dashed border-ink-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-ink-500">
                      {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(o.createdAt))}
                    </span>
                    <Badge variant="outline">Quitado</Badge>
                  </div>
                  <ul className="mt-1.5 text-xs text-ink-500 line-through">
                    {o.products.map((prod, i) => (
                      <li key={i}>
                        {prod.quantity}× {prod.name}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <GrantProductForm userId={id} products={products} />
    </div>
  );
}
