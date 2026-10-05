export const STORAGE_BUCKET = "album-media";

// Formatos aceptados (spec #12: formatos modernos, sin cargar archivos gigantes innecesarios).
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export const MAX_PHOTO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB por foto
export const MAX_VIDEO_SIZE_BYTES = 300 * 1024 * 1024; // 300 MB por vídeo (spec #12: límite de tamaño de vídeo)

export const THUMBNAIL_MAX_DIMENSION = 480;

export function mediaKind(file: File): "photo" | "video" | null {
  if (ACCEPTED_PHOTO_TYPES.includes(file.type)) return "photo";
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) return "video";
  return null;
}

export function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "bin";
}

export function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

export function buildMediaPath(albumId: string, mediaId: string, ext: string): string {
  return `${albumId}/${mediaId}.${ext}`;
}

export function buildThumbnailPath(albumId: string, mediaId: string): string {
  return `${albumId}/thumb_${mediaId}.jpg`;
}
