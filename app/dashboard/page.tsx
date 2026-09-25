import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserAlbums, getAvailableCredits } from "@/lib/queries/albums";
import { signOut } from "@/lib/actions/auth";
import { buttonVariants, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AlbumCard } from "@/components/dashboard/album-card";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = { title: "Tus recuerdos" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userData.user.id)
    .single();

  const [albums, credits] = await Promise.all([
    getUserAlbums(userData.user.id),
    getAvailableCredits(userData.user.id),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream-100 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900">
              Hola{(profile as any)?.full_name ? `, ${(profile as any).full_name}` : ""} 👋
            </h1>
            {(credits.albumCredits > 0 || credits.nfcCredits > 0) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {credits.albumCredits > 0 && (
                  <Badge variant="premium">
                    Te quedan {credits.albumCredits} álbum{credits.albumCredits !== 1 && "es"} Premium
                  </Badge>
                )}
                {credits.nfcCredits > 0 && (
                  <Badge variant="outline">
                    {credits.nfcCredits} NFC pendiente{credits.nfcCredits !== 1 && "s"} de asociar
                  </Badge>
                )}
              </div>
            )}
          </div>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Cerrar sesión
            </Button>
          </form>
        </header>

        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink-900">Mis recuerdos</h2>
          {albums.length > 0 && (
            <Link href="/albumes/nuevo" className={buttonVariants({ size: "sm" })}>
              <Plus className="h-4 w-4" /> Crear recuerdo
            </Link>
          )}
        </div>

        {albums.length === 0 ? (
          <EmptyState
            emoji="✨"
            title="¿Todavía no tienes recuerdos?"
            description="Tu primer álbum está a unos minutos de distancia."
            action={
              <Link href="/albumes/nuevo" className={buttonVariants({ size: "lg" })}>
                <Plus className="h-5 w-5" /> Crear mi primer recuerdo
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </div>
      </main>
    </>
  );
}
