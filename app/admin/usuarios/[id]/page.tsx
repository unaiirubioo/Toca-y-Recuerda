import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getUserDetail } from "@/lib/queries/admin-users";
import { getStoreProducts } from "@/lib/queries/products";
import { getAlbumAvailabilityStatus } from "@/lib/queries/albums";
import { Badge } from "@/components/ui/badge";
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
        <div className="mt-2 flex gap-2">
          {user.role === "admin" && <Badge variant="premium">Admin</Badge>}
          <Badge variant={user.isBlocked ? "outline" : "success"}>
            {user.isBlocked ? "Bloqueado" : "Activo"}
          </Badge>
        </div>
      </div>

      <AlbumAvailabilityBadge status={availability} />

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
          Compras ({user.orders.length})
        </h2>
        {user.orders.length === 0 ? (
          <p className="text-sm text-ink-500">Todavía no ha comprado nada.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {user.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <span className="text-ink-500">
                  {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(o.createdAt))}
                </span>
                <span className="font-medium text-ink-900">{formatEuros(o.totalCents)}</span>
                <Badge variant={o.status === "paid" ? "success" : "outline"}>{o.status}</Badge>
                {o.isGift && <Badge variant="premium">Regalo</Badge>}
                {o.isGift && o.status === "paid" && <RevokeGiftButton orderId={o.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>

      <GrantProductForm userId={id} products={products} />
    </div>
  );
}
