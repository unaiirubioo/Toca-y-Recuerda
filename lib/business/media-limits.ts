export type AlbumUsage = {
  photoCount: number;
  videoCount: number;
  photoLimit: number;
  videoLimit: number;
  storageUsedMb: number;
  storageLimitMb: number;
};

/** ¿Añadir una foto o vídeo más supera el límite de cantidad del álbum? */
export function exceedsCountLimit(kind: "photo" | "video", usage: AlbumUsage): boolean {
  if (kind === "photo") return usage.photoCount >= usage.photoLimit;
  return usage.videoCount >= usage.videoLimit;
}

/** ¿Añadir `addMb` más supera el límite de almacenamiento del álbum? */
export function exceedsStorageLimit(usage: Pick<AlbumUsage, "storageUsedMb" | "storageLimitMb">, addMb: number): boolean {
  return usage.storageUsedMb + addMb > usage.storageLimitMb;
}
