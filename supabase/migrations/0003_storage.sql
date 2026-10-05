-- =====================================================================
-- Toca y Recuerda — Storage de medios de álbum (Fase 5)
-- =====================================================================
-- Convenio de rutas dentro del bucket: <album_id>/<media_id>.<ext>
-- y <album_id>/thumb_<media_id>.<ext> para las miniaturas.
-- El primer segmento de la ruta (storage.foldername) es siempre el
-- album_id, así podemos comprobar propiedad uniendo con public.albums
-- sin tener que duplicar el owner_id en cada objeto.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('album-media', 'album-media', false)
on conflict (id) do nothing;

-- El propietario del álbum puede subir, leer, actualizar y borrar sus propios archivos.
create policy "album_media_owner_all"
on storage.objects for all
using (
  bucket_id = 'album-media'
  and exists (
    select 1 from public.albums a
    where a.id::text = (storage.foldername(name))[1]
      and (a.owner_id = auth.uid() or public.is_admin(auth.uid()))
  )
)
with check (
  bucket_id = 'album-media'
  and exists (
    select 1 from public.albums a
    where a.id::text = (storage.foldername(name))[1]
      and (a.owner_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

-- Lectura pública SOLO para álbumes publicados y públicos (spec #25/#45).
-- Los álbumes privados nunca son legibles por esta vía: sus archivos se
-- sirven mediante URLs firmadas generadas por el servidor (Fase 6/13).
create policy "album_media_public_read"
on storage.objects for select
using (
  bucket_id = 'album-media'
  and exists (
    select 1 from public.albums a
    where a.id::text = (storage.foldername(name))[1]
      and a.status = 'published'
      and a.privacy = 'public'
  )
);
