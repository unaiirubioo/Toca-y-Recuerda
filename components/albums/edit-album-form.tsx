"use client";

import { useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, Trash2, Sparkles, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StorageUsage } from "@/components/ui/storage-usage";
import { updateAlbum, publishAlbum, deleteAlbum, unlinkNfc, linkOwnedNfc } from "@/lib/actions/albums";
import type { AlbumFormValues } from "@/lib/validations/albums";
import type { AlbumMediaItem } from "@/lib/queries/media";
import { MediaUploader } from "@/components/albums/media-uploader";
import { MediaGrid } from "@/components/albums/media-grid";
import { MemoriesEditor } from "@/components/albums/memories-editor";
import { LocationAutocomplete } from "@/components/albums/location-autocomplete";
import { NfcLinkByCodeForm } from "@/components/albums/nfc-link-form";
import { CoverUploader } from "@/components/albums/cover-uploader";

const LocationPicker = dynamic(
  () => import("@/components/albums/location-picker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="h-[260px] rounded-xl bg-ink-50" /> }
);

const THEMES = [
  { value: "classic", label: "Clásico", swatch: "bg-ink-700" },
  { value: "moderno", label: "Moderno", swatch: "bg-amber-500" },
  { value: "minimal", label: "Minimalista", swatch: "bg-ink-300" },
] as const;

const LAYOUTS = [
  { value: "grid", label: "Cuadrícula" },
  { value: "revista", label: "Revista" },
  { value: "linea-tiempo", label: "Línea de tiempo" },
] as const;

export type EditableAlbum = Partial<AlbumFormValues> & {
  id: string;
  status: "draft" | "published";
  is_premium: boolean;
  public_slug: string;
  memory?: string | null;
  coverMediaId: string | null;
  photoCount: number;
  videoCount: number;
  photoLimit: number;
  videoLimit: number;
  storageUsedMb: number;
  storageLimitMb: number;
};

export function EditAlbumForm({
  album,
  media,
  nfc,
  hasUnassignedNfc,
  initialMemories,
  aiDescription,
  justCreated,
}: {
  album: EditableAlbum;
  media: AlbumMediaItem[];
  nfc: { id: string; public_token: string; status: string } | null;
  hasUnassignedNfc: boolean;
  initialMemories: string[];
  aiDescription?: string | null;
  justCreated?: boolean;
}) {
  const [showAiBanner, setShowAiBanner] = useState(!!justCreated && !!aiDescription);
  const [form, setForm] = useState({
    title: album.title ?? "",
    eventDateStart: album.eventDateStart ?? "",
    eventDateEnd: album.eventDateEnd ?? "",
    locationName: album.locationName ?? "",
    locationLat: album.locationLat ?? null,
    locationLng: album.locationLng ?? null,
    designTheme: album.designTheme ?? "classic",
    designLayout: album.designLayout ?? "grid",
    musicUrl: album.musicUrl ?? "",
    musicTitle: album.musicTitle ?? "",
    privacy: album.privacy ?? "private",
    privacyPassword: "",
  });
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSavedMessage(null);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateAlbum(album.id, form as Partial<AlbumFormValues>);
      if (result?.error) {
        setError(result.error);
      } else {
        setSavedMessage("Cambios guardados.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {showAiBanner && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-900">¡Tu álbum ya está listo!</p>
            <p className="mt-0.5 text-sm text-ink-700">"{aiDescription}"</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAiBanner(false)}
            aria-label="Cerrar"
            className="flex-shrink-0 rounded-lg p-1 text-ink-500 hover:bg-white/60 focus-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-semibold text-ink-900">Editar recuerdo</h1>
          <Badge variant={album.status === "published" ? "success" : "outline"}>
            {album.status === "published" ? "Publicado" : "Borrador"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {album.status === "published" && (
            <Link
              href={`/album/${album.public_slug}`}
              target="_blank"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Ver álbum
            </Link>
          )}
          <Link href="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Volver
          </Link>
        </div>
      </div>

      <CoverUploader
        albumId={album.id}
        coverUrl={media.find((m) => m.id === album.coverMediaId)?.url ?? null}
      />

      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-soft">
        <div>
          <Label htmlFor="title">Nombre</Label>
          <Input id="title" value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start">Inicio</Label>
            <Input
              id="start"
              type="date"
              value={form.eventDateStart ?? ""}
              onChange={(e) => update("eventDateStart", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="end">Fin (opcional)</Label>
            <Input
              id="end"
              type="date"
              value={form.eventDateEnd ?? ""}
              onChange={(e) => update("eventDateEnd", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-6 shadow-soft">
        <Label htmlFor="locationName">Lugar</Label>
        <LocationAutocomplete
          value={form.locationName ?? ""}
          onTextChange={(text) => update("locationName", text)}
          onSelect={(label, lat, lng) => {
            update("locationName", label);
            update("locationLat", lat);
            update("locationLng", lng);
          }}
        />
        <LocationPicker
          lat={form.locationLat}
          lng={form.locationLng}
          onChange={(lat, lng) => {
            update("locationLat", lat);
            update("locationLng", lng);
          }}
        />
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-ink-900">Fotos y vídeos</h2>
          <span className="text-xs text-ink-500">
            {album.photoCount}/{album.photoLimit} fotos · {album.videoCount}/{album.videoLimit} vídeos
          </span>
        </div>
        <StorageUsage usedMb={album.storageUsedMb} limitMb={album.storageLimitMb} />
        <MediaUploader albumId={album.id} />
        <MediaGrid albumId={album.id} media={media} coverMediaId={album.coverMediaId} />
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="font-display text-base font-semibold text-ink-900">Los momentos de este recuerdo</h2>
        <p className="text-sm text-ink-500">
          Añade tantos momentos como quieras — no solo el texto inicial que escribiste al crear el álbum.
        </p>
        <MemoriesEditor albumId={album.id} initial={initialMemories} />
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="font-display text-base font-semibold text-ink-900">Estilo</h2>
        <div>
          <Label>Tema</Label>
          <div className="flex gap-3">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => update("designTheme", t.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs focus-ring ${
                  form.designTheme === t.value ? "border-amber-500" : "border-ink-100"
                }`}
              >
                <span className={`h-8 w-8 rounded-full ${t.swatch}`} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>Distribución</Label>
          <div className="flex flex-wrap gap-2">
            {LAYOUTS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => update("designLayout", l.value)}
                className={`rounded-full border px-4 py-2 text-sm focus-ring ${
                  form.designLayout === l.value
                    ? "border-amber-500 bg-amber-500/10 text-amber-600"
                    : "border-ink-100 text-ink-700"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-6 shadow-soft">
        <div>
          <Label htmlFor="musicTitle">Música — título</Label>
          <Input
            id="musicTitle"
            value={form.musicTitle ?? ""}
            onChange={(e) => update("musicTitle", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="musicUrl">Música — enlace</Label>
          <Input
            id="musicUrl"
            type="url"
            value={form.musicUrl ?? ""}
            onChange={(e) => update("musicUrl", e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-6 shadow-soft">
        <Label>Privacidad</Label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => update("privacy", "public")}
            className={`flex-1 rounded-xl border p-3 text-sm focus-ring ${
              form.privacy === "public" ? "border-amber-500 bg-amber-500/10" : "border-ink-100"
            }`}
          >
            🔓 Público
          </button>
          <button
            type="button"
            onClick={() => update("privacy", "private")}
            className={`flex-1 rounded-xl border p-3 text-sm focus-ring ${
              form.privacy === "private" ? "border-amber-500 bg-amber-500/10" : "border-ink-100"
            }`}
          >
            🔒 Privado
          </button>
        </div>
        {form.privacy === "private" && (
          <div>
            <Label htmlFor="privacyPassword">Cambiar contraseña</Label>
            <Input
              id="privacyPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Déjalo en blanco para no cambiarla"
              value={form.privacyPassword}
              onChange={(e) => update("privacyPassword", e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-500">
              Quien tenga el enlace o el NFC necesitará esta contraseña
              para ver el álbum. Escribe una nueva y pulsa "Guardar
              cambios" para actualizarla.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl bg-white p-6 shadow-soft">
        <h2 className="font-display text-base font-semibold text-ink-900">NFC</h2>
        {nfc ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-sm text-ink-700">{nfc.public_token}</p>
              <p className="text-xs text-ink-500">Este recuerdo se abre acercando el móvil a ese NFC.</p>
            </div>
            <form
              action={() => unlinkNfc(album.id)}
              onSubmit={(e) => {
                if (!confirm("¿Desvincular este NFC? El álbum no se borra, pero el NFC dejará de abrirlo.")) {
                  e.preventDefault();
                }
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Desvincular NFC
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">
              Este recuerdo todavía no tiene un NFC físico asociado.
            </p>

            <NfcLinkByCodeForm albumId={album.id} />

            <div className="flex flex-wrap items-center gap-3 border-t border-ink-100 pt-3">
              {hasUnassignedNfc && (
                <form action={() => linkOwnedNfc(album.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Vincular uno de tus NFC disponibles
                  </Button>
                </form>
              )}
              <Link href="/tienda" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                O cómpralo en la tienda
              </Link>
            </div>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-danger">{error}</p>}
      {savedMessage && <p className="text-sm text-success">{savedMessage}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={save} disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cambios
        </Button>

        <div className="flex items-center gap-3">
          {album.status === "draft" && (
            <form action={() => publishAlbum(album.id)}>
              <Button type="submit">Publicar álbum</Button>
            </form>
          )}
          <form
            action={() => deleteAlbum(album.id)}
            onSubmit={(e) => {
              if (!confirm("¿Seguro que quieres eliminar este álbum? Esta acción no se puede deshacer.")) {
                e.preventDefault();
              }
            }}
          >
            <Button type="submit" variant="ghost" className="text-danger hover:bg-danger/10">
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
