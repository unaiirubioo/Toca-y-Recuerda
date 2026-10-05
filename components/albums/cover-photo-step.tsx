"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { generateImageThumbnail } from "@/lib/media-thumbnails";
import { uploadToSignedUrl } from "@/lib/upload-to-signed-url";
import { createUploadSlot, confirmMediaUpload, setCoverMedia } from "@/lib/actions/media";
import { analyzeImageFile } from "@/lib/ai/client-vision";

/**
 * Paso opcional del asistente (spec #1): elegir ya una foto de portada
 * ANTES de subir el resto de fotos y vídeos. Es opcional a propósito —
 * "Continuar" sin elegir nada es válido, y la portada se puede poner o
 * cambiar después igualmente desde la edición del álbum.
 */
export function CoverPhotoStep({ albumId }: { albumId: string | null }) {
  const [status, setStatus] = useState<"idle" | "subiendo" | "listo" | "error">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!albumId) {
      setError("Todavía no se ha creado el álbum — vuelve al primer paso e inténtalo de nuevo.");
      return;
    }
    setError(null);
    setStatus("subiendo");
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const thumb = await generateImageThumbnail(file);
      const analysis = await analyzeImageFile(file);

      const slot = await createUploadSlot(albumId, { name: file.name, size: file.size, type: "photo" });
      if ("error" in slot) {
        setStatus("error");
        setError(slot.error);
        return;
      }

      await uploadToSignedUrl(slot.signedUrl, file);
      await uploadToSignedUrl(slot.thumbnailSignedUrl, thumb.blob);

      const result = await confirmMediaUpload(albumId, {
        mediaId: slot.mediaId,
        type: "photo",
        storagePath: slot.path,
        thumbnailPath: slot.thumbnailPath,
        fileName: file.name,
        sizeBytes: file.size,
        width: thumb.width,
        height: thumb.height,
        takenAt: analysis.takenAt ?? undefined,
        lat: analysis.lat ?? undefined,
        lng: analysis.lng ?? undefined,
        phash: analysis.phash ?? undefined,
        blurScore: analysis.blurScore ?? undefined,
        tags: analysis.tags,
      });
      if ("error" in result) {
        setStatus("error");
        setError(result.error);
        return;
      }

      const coverResult = await setCoverMedia(albumId, slot.mediaId);
      if (coverResult?.error) {
        setStatus("error");
        setError(coverResult.error);
        return;
      }

      setStatus("listo");
    } catch {
      setStatus("error");
      setError("No hemos podido subir esa foto. Inténtalo otra vez.");
    }
  }

  function clear() {
    setPreviewUrl(null);
    setStatus("idle");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">
        Si quieres, elige ya la foto que aparecerá como portada del álbum. Es opcional — puedes
        saltarte este paso y ponerla (o cambiarla) más adelante.
      </p>

      {previewUrl ? (
        <div className="relative mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Portada elegida" className="h-full w-full object-cover" />
          {status === "subiendo" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {status === "listo" && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-ink-900 hover:bg-white focus-ring"
              aria-label="Quitar portada elegida"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink-100 p-8 text-center text-sm text-ink-500 hover:border-amber-500 hover:text-amber-600 focus-ring"
        >
          <ImagePlus className="h-7 w-7" />
          Elegir foto de portada
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {status === "listo" && <p className="text-sm text-success">Portada guardada.</p>}
    </div>
  );
}
