-- ---------------------------------------------------------------------
-- HISTORIA CON IA (spec): el álbum deja de ser una simple galería.
--
-- Todo el análisis "pesado" (EXIF, duplicados, desenfoque, qué aparece
-- en cada foto) se hace GRATIS Y SIN LÍMITE en el propio navegador de
-- quien sube las fotos (ver lib/ai/client-vision.ts) — nunca en un
-- servicio de pago de terceros. Aquí solo guardamos el resultado de
-- ese análisis para poder agrupar los archivos en "momentos" y generar
-- los títulos/descripciones (lib/ai/story-builder.ts +
-- lib/actions/ai-design.ts), que sí usan un modelo de texto gratuito
-- (text.pollinations.ai, ya usado en el proyecto) pero solo con texto
-- (etiquetas, fechas, lugar) — nunca se les envían las fotos.
-- ---------------------------------------------------------------------

alter table public.album_media
  add column if not exists taken_at timestamptz,
  add column if not exists phash text,
  add column if not exists blur_score real,
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_highlight boolean not null default false,
  add column if not exists moment_index integer;

comment on column public.album_media.taken_at is 'Fecha/hora real de la foto o vídeo, leída de los metadatos EXIF en el navegador (o, si no hay, la fecha de subida).';
comment on column public.album_media.phash is 'Hash perceptual (aHash de 64 bits, en hexadecimal) calculado en el navegador — para detectar fotos duplicadas o casi iguales sin enviarlas a ningún sitio.';
comment on column public.album_media.blur_score is 'Nitidez estimada (varianza de Laplace) calculada en el navegador: más bajo = más borrosa.';
comment on column public.album_media.tags is 'Etiquetas de lo que aparece en la foto, detectadas en el propio navegador con un modelo de clasificación de imágenes gratuito (MobileNet vía TensorFlow.js).';
comment on column public.album_media.is_highlight is 'Si la IA la eligió como "momento destacado" de su sección, en vez de solo aparecer en "Todos los recuerdos".';
comment on column public.album_media.moment_index is 'A qué sección/momento de la historia generada pertenece este archivo (índice dentro de albums.ai_story.sections).';

alter table public.albums
  add column if not exists ai_story jsonb;

comment on column public.albums.ai_story is
  'Historia generada por IA a partir de los momentos detectados: { "intro": string, "sections": [{ "title": string, "description": string, "mediaIds": string[], "highlightMediaIds": string[] }], "closing": string }. Se genera una vez al publicar y no se recalcula solo; se puede volver a generar bajo demanda.';

create index if not exists idx_album_media_taken_at on public.album_media(album_id, taken_at);
