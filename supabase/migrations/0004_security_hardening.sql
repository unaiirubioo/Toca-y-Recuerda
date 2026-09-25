-- =====================================================================
-- Toca y Recuerda — Fase 13: hardening de seguridad
-- =====================================================================
-- El navegador ya restringe qué se puede subir (spec #10), pero nunca
-- hay que confiar solo en eso (spec #45): el propio bucket de Storage
-- rechaza ahora cualquier tipo o tamaño no permitido, aunque alguien
-- llame a la API de Storage directamente sin pasar por nuestro código.

update storage.buckets
set
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'video/mp4', 'video/quicktime', 'video/webm'
  ],
  file_size_limit = 314572800 -- 300 MB: el máximo de los dos tipos (vídeo), ver lib/storage.ts
where id = 'album-media';
