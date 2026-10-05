import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAlbumAuthMeta, getPublicAlbum } from "@/lib/queries/public-album";
import { hasAlbumAccess } from "@/lib/actions/public-album";
import { AlbumViewer } from "@/components/album-viewer/album-viewer";
import { PasswordGate } from "@/components/album-viewer/password-gate";
import { NfcNotConfigured } from "@/components/album-viewer/nfc-not-configured";
import { decideNfcOutcome } from "@/lib/business/nfc-resolution";

export const metadata: Metadata = { robots: { index: false } };

export default async function NfcResolverPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: tag } = await admin
    .from("nfc_tags")
    .select("id, album_id, status, scan_count")
    .eq("public_token", token)
    .maybeSingle();

  const t = tag as any;

  // Analítica de escaneo (spec #52), sin bloquear la respuesta si falla.
  if (t) {
    void admin
      .from("nfc_tags")
      .update({ scan_count: (t.scan_count ?? 0) + 1, last_scanned_at: new Date().toISOString() })
      .eq("id", t.id);
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const meta = t?.album_id ? await getAlbumAuthMeta(t.album_id) : null;
  const hasPrivateAccess = meta?.privacy === "private" ? await hasAlbumAccess(meta.id) : false;

  const outcome = decideNfcOutcome({
    tagExists: !!t,
    albumId: t?.album_id ?? null,
    albumExists: !!meta,
    albumStatus: meta?.status,
    albumPrivacy: meta?.privacy,
    isLoggedIn: !!userData.user,
    hasPrivateAccess,
  });

  switch (outcome.type) {
    case "not_found":
      notFound();

    case "not_configured":
      if (outcome.redirectToWizard) redirect(`/albumes/nuevo?nfc=${encodeURIComponent(token)}`);
      return <NfcNotConfigured token={token} />;

    case "preparing":
      return (
        <main className="flex min-h-screen items-center justify-center bg-cream-100 px-4 text-center">
          <div>
            <div className="mb-4 text-4xl">🛠️</div>
            <h1 className="font-display text-xl font-semibold text-ink-900">
              Este recuerdo todavía se está preparando
            </h1>
            <p className="mt-2 text-ink-500">Vuelve a intentarlo más tarde.</p>
          </div>
        </main>
      );

    case "password_required":
      return <PasswordGate mode="token" identifier={token} />;

    case "viewer": {
      const album = await getPublicAlbum(t.album_id);
      if (!album) notFound();
      return <AlbumViewer album={album} />;
    }
  }
}
