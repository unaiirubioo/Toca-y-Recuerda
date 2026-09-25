"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Film, ImagePlus, Loader2, RotateCcw, X } from "lucide-react";
import {
  ACCEPTED_PHOTO_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_PHOTO_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  mediaKind,
} from "@/lib/storage";
import { generateImageThumbnail, generateVideoThumbnail } from "@/lib/media-thumbnails";
import { uploadToSignedUrl } from "@/lib/upload-to-signed-url";
import { createUploadSlot, confirmMediaUpload } from "@/lib/actions/media";
import { cn } from "@/lib/utils";

type QueueStatus = "preparando" | "subiendo" | "procesando" | "listo" | "error";

type QueueItem = {
  id: string;
  file: File;
  kind: "photo" | "video";
  status: QueueStatus;
  progress: number;
  error?: string;
};

const ALL_ACCEPTED = [...ACCEPTED_PHOTO_TYPES, ...ACCEPTED_VIDEO_TYPES];

export function MediaUploader({ albumId }: { albumId: string }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const router = useRouter();

  function patchItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  const processFile = useCallback(
    async (item: QueueItem) => {
      try {
        patchItem(item.id, { status: "preparando", error: undefined, progress: 0 });

        const thumb =
          item.kind === "photo"
            ? await generateImageThumbnail(item.file)
            : await generateVideoThumbnail(item.file);

        const slot = await createUploadSlot(albumId, {
          name: item.file.name,
          size: item.file.size,
          type: item.kind,
        });
        if ("error" in slot) {
          patchItem(item.id, { status: "error", error: slot.error });
          return;
        }

        patchItem(item.id, { status: "subiendo", progress: 0 });
        await uploadToSignedUrl(slot.signedUrl, item.file, (percent) =>
          patchItem(item.id, { progress: percent })
        );
        await uploadToSignedUrl(slot.thumbnailSignedUrl, thumb.blob);

        patchItem(item.id, { status: "procesando", progress: 100 });

        const result = await confirmMediaUpload(albumId, {
          mediaId: slot.mediaId,
          type: item.kind,
          storagePath: slot.path,
          thumbnailPath: slot.thumbnailPath,
          fileName: item.file.name,
          sizeBytes: item.file.size,
          width: "width" in thumb ? thumb.width : undefined,
          height: "height" in thumb ? thumb.height : undefined,
          durationSeconds: "duration" in thumb ? thumb.duration : undefined,
        });

        if ("error" in result) {
          patchItem(item.id, { status: "error", error: result.error });
          return;
        }

        patchItem(item.id, { status: "listo" });
        router.refresh();
      } catch {
        patchItem(item.id, {
          status: "error",
          error: "Ha ocurrido un problema al subir este archivo.",
        });
      }
    },
    [albumId, router]
  );

  function addFiles(files: FileList | File[]) {
    const items: QueueItem[] = [];

    for (const file of Array.from(files)) {
      const kind = mediaKind(file);
      if (!kind) continue; // Tipo no admitido: se ignora silenciosamente, sin romper el resto.

      const maxSize = kind === "photo" ? MAX_PHOTO_SIZE_BYTES : MAX_VIDEO_SIZE_BYTES;
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;

      if (file.size > maxSize) {
        items.push({
          id,
          file,
          kind,
          status: "error",
          progress: 0,
          error: `Pesa demasiado (máximo ${Math.round(maxSize / (1024 * 1024))} MB).`,
        });
        continue;
      }

      items.push({ id, file, kind, status: "preparando", progress: 0 });
    }

    setQueue((prev) => [...prev, ...items]);
    items.filter((i) => i.status !== "error").forEach((item) => processFile(item));
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition",
          dragOver ? "border-amber-500 bg-amber-500/5" : "border-ink-100"
        )}
      >
        <ImagePlus className="h-8 w-8 text-ink-300" />
        <p className="text-sm text-ink-500">Arrastra tus fotos y vídeos aquí, o</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-sm font-medium text-amber-600 hover:underline focus-ring"
        >
          + Añadir fotos y vídeos
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALL_ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3"
            >
              {item.kind === "photo" ? (
                <ImagePlus className="h-5 w-5 flex-shrink-0 text-ink-300" />
              ) : (
                <Film className="h-5 w-5 flex-shrink-0 text-ink-300" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-900">{item.file.name}</p>

                {item.status === "error" ? (
                  <p className="flex items-center gap-1 text-xs text-danger">
                    <AlertCircle className="h-3.5 w-3.5" /> {item.error ?? "Ha ocurrido un problema"}
                  </p>
                ) : item.status === "listo" ? (
                  <p className="text-xs text-success">Listo</p>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-50">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${item.status === "subiendo" ? item.progress : 100}%` }}
                      />
                    </div>
                    <span className="w-20 flex-shrink-0 text-xs text-ink-500">
                      {item.status === "preparando" && "Preparando…"}
                      {item.status === "subiendo" && `Subiendo ${item.progress}%`}
                      {item.status === "procesando" && "Procesando…"}
                    </span>
                  </div>
                )}
              </div>

              {item.status === "error" && item.error?.includes("problema") && (
                <button
                  type="button"
                  onClick={() => processFile(item)}
                  className="flex-shrink-0 rounded-lg p-1.5 text-ink-500 hover:bg-ink-50 focus-ring"
                  aria-label="Reintentar"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              {(item.status === "preparando" || item.status === "subiendo" || item.status === "procesando") && (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-ink-300" />
              )}
              <button
                type="button"
                onClick={() => setQueue((prev) => prev.filter((q) => q.id !== item.id))}
                className="flex-shrink-0 rounded-lg p-1.5 text-ink-300 hover:bg-ink-50 focus-ring"
                aria-label="Quitar de la lista"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
