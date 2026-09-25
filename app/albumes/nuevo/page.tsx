import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { checkCanCreateAlbum } from "@/lib/actions/albums";
import { AlbumWizard } from "@/components/albums/album-wizard";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = { title: "Crea tu recuerdo" };

export default async function NewAlbumPage({
  searchParams,
}: {
  searchParams: Promise<{ nfc?: string }>;
}) {
  const { nfc } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const canCreate = await checkCanCreateAlbum(data.user.id);
  if (!canCreate) redirect("/albumes/limite");

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream-100 px-4 py-10">
        <AlbumWizard nfcToken={nfc} />
      </main>
    </>
  );
}
