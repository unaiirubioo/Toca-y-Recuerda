"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { generateImageThumbnail } from "@/lib/media-thumbnails";
import { uploadToSignedUrl } from "@/lib/upload-to-signed-url";
import { createUploadSlot, confirmMediaUpload, setCoverMedia } from "@/lib/actions/media";
import { mediaKind, MAX_PHOTO_SIZE_BYTES } from "@/lib/storage";
import type { AlbumMediaItem } from "@/lib/queries/media";

export function CoverUploader({
  albumId,
  coverUrl,
}: {
  albumId: string;
  coverUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    setError(null);

    const kind = mediaKind(file);
    if (kind !== "photo") {
      setError("La portada tiene que ser una foto (jpg, png o webp).");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setError(`Pesa demasiado (máximo ${Math.round(MAX_PHOTO_SIZE_BYTES / (1024 * 1024))} MB).`);
      return;
    }

    setUploading(true);
    try {
      const thumb = await generateImageThumbnail(file);
      const slot = await createUploadSlot(albumId, { name: file.name, size: file.size, type: "photo" });
      if ("error" in slot) {
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
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      await setCoverMedia(albumId, slot.mediaId);
      router.refresh();
    } catch {
      setError("No hemos podido subir la portada. Inténtalo otra vez.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
      <div className="relative h-48 bg-ink-50">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="Portada del álbum" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-300">
            <ImagePlus className="h-10 w-10" />
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-medium text-ink-900 shadow-card hover:bg-white focus-ring disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {coverUrl ? "Cambiar portada" : "Subir portada"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="px-4 py-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
