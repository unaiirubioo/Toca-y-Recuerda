import { THUMBNAIL_MAX_DIMENSION } from "@/lib/storage";

/**
 * Redimensiona una imagen a un máximo de THUMBNAIL_MAX_DIMENSION px y la
 * devuelve como Blob JPEG.
 *
 * Fallback importante: HEIC (el formato por defecto de fotos de
 * iPhone) no lo decodifica `createImageBitmap` en la mayoría de
 * navegadores de escritorio (Chrome, Firefox) aunque esté en la lista
 * de tipos aceptados. Antes esto rompía la subida entera en silencio;
 * ahora, si falla la decodificación, se usa el propio archivo original
 * como "miniatura" (ocupa más que una miniatura de verdad, pero la
 * subida no se rompe) en vez de perder la foto.
 */
export async function generateImageThumbnail(
  file: File
): Promise<{ blob: Blob; width: number; height: number; isFallback?: boolean }> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, THUMBNAIL_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo preparar la miniatura.");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la miniatura."))), "image/jpeg", 0.82)
    );

    return { blob, width: bitmap.width, height: bitmap.height };
  } catch {
    // Formato no decodificable por el navegador (típicamente HEIC):
    // se sube el original como miniatura en vez de fallar del todo.
    return { blob: file, width: 0, height: 0, isFallback: true };
  }
}

/** Captura el fotograma al segundo 1 de un vídeo como miniatura JPEG. */
export async function generateVideoThumbnail(
  file: File
): Promise<{ blob: Blob; width: number; height: number; duration: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("No se pudo leer el vídeo."));
  });

  video.currentTime = Math.min(1, video.duration / 2);
  await new Promise<void>((resolve) => (video.onseeked = () => resolve()));

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, THUMBNAIL_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la miniatura.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo generar la miniatura."))), "image/jpeg", 0.82)
  );

  URL.revokeObjectURL(url);
  return { blob, width: video.videoWidth, height: video.videoHeight, duration: Math.round(video.duration) };
}
