import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { RenewalCheckoutButton } from "./renewal-checkout-button";

export const metadata: Metadata = { title: "Renovar álbum" };

export default async function RenewAlbumPage({ params }: { params: Promise<{ albumId: string }> }) {
  const { albumId } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?next=/album/renovar/${albumId}`);

  const { data: album } = await supabase
    .from("albums")
    .select("id, title, public_slug")
    .eq("id", albumId)
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  if (!album) notFound();

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-card">
        <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">
          Renovar &ldquo;{(album as any).title}&rdquo;
        </h1>
        <p className="mb-6 text-sm text-ink-500">
          5 años más de conservación para este álbum, con el mismo precio que un álbum Premium.
        </p>
        <RenewalCheckoutButton albumId={albumId} />
      </div>
    </main>
  );
}
