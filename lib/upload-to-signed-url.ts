/**
 * Sube `file` a la signedUrl devuelta por createSignedUploadUrl.
 * Usamos XHR (en vez de fetch) porque es la única API del navegador que
 * expone progreso real de subida (spec #11: mostrar porcentaje real).
 */
export function uploadToSignedUrl(
  signedUrl: string,
  file: File | Blob,
  onProgress?: (percent: number) => void
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  const fullUrl = signedUrl.startsWith("http") ? signedUrl : `${base}/storage/v1${signedUrl}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", fullUrl, true);
    xhr.setRequestHeader("Content-Type", (file as File).type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`La subida falló (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("La subida falló por un problema de red."));

    xhr.send(file);
  });
}
