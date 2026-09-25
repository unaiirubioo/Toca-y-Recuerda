-- =====================================================================
-- Toca y Recuerda — Fase 16: correcciones tras auditoría de seguridad
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PRIVILEGIOS DE COLUMNA (spec #45)
-- ---------------------------------------------------------------------
-- RLS solo controla QUÉ FILAS puede tocar cada usuario, nunca QUÉ
-- COLUMNAS. Sin esto, cualquier usuario podía llamar a supabase-js
-- directamente desde la consola del navegador (con la anon key, que es
-- pública) y hacer, por ejemplo:
--   update profiles set role = 'admin' where id = auth.uid()
--   update albums set is_premium = true, storage_limit_mb = 999999
-- Revocar el privilegio a nivel de columna lo bloquea aunque RLS
-- permitiera la fila. Los Server Actions que necesitan escribir estas
-- columnas ahora usan el cliente admin (service_role, que no está
-- sujeto a estas revocaciones) tras validar todo en el propio código.

revoke update (role, is_blocked) on public.profiles from authenticated, anon;

revoke insert (is_premium, photo_limit, video_limit, storage_limit_mb, storage_used_mb, photo_count, video_count)
  on public.albums from authenticated, anon;
revoke update (is_premium, photo_limit, video_limit, storage_limit_mb, storage_used_mb, photo_count, video_count)
  on public.albums from authenticated, anon;

revoke update (status, owner_id, album_id, order_id, public_token, scan_count, last_scanned_at)
  on public.nfc_tags from authenticated, anon;

-- Esta política quedaba obsoleta por la revocación anterior (permitía
-- una actualización que ahora el propio motor de columnas ya bloquea);
-- se retira para no dejar documentación engañosa sobre lo que el
-- usuario puede hacer directamente.
drop policy if exists "nfc_tags_owner_update_album_link" on public.nfc_tags;

-- orders / order_items nunca deben ser insertables directamente por el
-- usuario (spec #21): el total y los importes los calcula el servidor
-- a partir de products, no el navegador. Ahora se crean exclusivamente
-- vía el cliente admin desde createCheckoutSession, ya validado en
-- código — así que ni siquiera necesitan una política de INSERT propia.
-- (No existía ninguna hasta ahora: era, de hecho, un bug — createCheckoutSession
-- intentaba insertar con el cliente normal y RLS lo bloqueaba en silencio.)

-- ---------------------------------------------------------------------
-- 2. FUNCIONES ATÓMICAS (corrigen condiciones de carrera reales)
-- ---------------------------------------------------------------------

-- Reserva UN NFC de stock de forma atómica: SELECT ... FOR UPDATE SKIP
-- LOCKED impide que dos compras simultáneas se lleven el mismo chip
-- físico (antes era un SELECT y un UPDATE por separado, sin bloqueo).
create or replace function public.reserve_nfc_tag(p_owner_id uuid, p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.nfc_tags
  where status = 'stock'
  order by created_at
  for update skip locked
  limit 1;

  if v_id is null then
    return null;
  end if;

  update public.nfc_tags
  set status = 'sold', owner_id = p_owner_id, order_id = p_order_id
  where id = v_id;

  return v_id;
end;
$$;

-- Consume UN crédito de álbum Premium de forma atómica: evita que dos
-- clics/pestañas simultáneos consuman el mismo crédito dos veces.
create or replace function public.try_consume_album_credit(p_user_id uuid)
returns table (id uuid, photo_limit integer, video_limit integer, storage_limit_mb integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_photo integer;
  v_video integer;
  v_storage integer;
begin
  select ac.id, ac.photo_limit, ac.video_limit, ac.storage_limit_mb
    into v_id, v_photo, v_video, v_storage
  from public.album_credits ac
  where ac.user_id = p_user_id and ac.consumed = false
  order by ac.created_at
  for update skip locked
  limit 1;

  if v_id is null then
    return;
  end if;

  update public.album_credits set consumed = true where id = v_id;

  return query select v_id, v_photo, v_video, v_storage;
end;
$$;

-- Compensación: si tras consumir el crédito la creación del álbum
-- falla por cualquier motivo, se libera para no perderlo.
create or replace function public.release_album_credit(p_credit_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.album_credits set consumed = false where id = p_credit_id;
$$;

-- Estas funciones solo las llama nuestro propio backend con el cliente
-- admin. Postgres concede EXECUTE a PUBLIC por defecto al crear una
-- función — hay que revocarlo explícitamente o cualquiera podría
-- reservar NFC/créditos ajenos llamando al RPC directamente.
revoke execute on function public.reserve_nfc_tag(uuid, uuid) from public, authenticated, anon;
revoke execute on function public.try_consume_album_credit(uuid) from public, authenticated, anon;
revoke execute on function public.release_album_credit(uuid) from public, authenticated, anon;
grant execute on function public.reserve_nfc_tag(uuid, uuid) to service_role;
grant execute on function public.try_consume_album_credit(uuid) to service_role;
grant execute on function public.release_album_credit(uuid) to service_role;

-- Recalcula fotos/vídeos/almacenamiento reales de un álbum a partir de
-- album_media — corrige la deriva de los contadores incrementales tras
-- cualquier fallo a medias. Se expone también una versión "para todos
-- los álbumes" para el botón de /admin.
create or replace function public.recalculate_album_counters(p_album_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.albums a
  set
    photo_count = coalesce((select count(*) from public.album_media m where m.album_id = a.id and m.type = 'photo'), 0),
    video_count = coalesce((select count(*) from public.album_media m where m.album_id = a.id and m.type = 'video'), 0),
    storage_used_mb = coalesce((select sum(m.size_bytes) from public.album_media m where m.album_id = a.id), 0) / 1048576.0
  where a.id = p_album_id;
$$;

create or replace function public.recalculate_all_album_counters()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_album record;
begin
  for v_album in select id from public.albums loop
    perform public.recalculate_album_counters(v_album.id);
  end loop;
end;
$$;

revoke execute on function public.recalculate_album_counters(uuid) from public, authenticated, anon;
revoke execute on function public.recalculate_all_album_counters() from public, authenticated, anon;
grant execute on function public.recalculate_album_counters(uuid) to service_role;
grant execute on function public.recalculate_all_album_counters() to service_role;

-- ---------------------------------------------------------------------
-- 3. AJUSTES DE PLATAFORMA EDITABLES (plan gratuito, spec #56)
-- ---------------------------------------------------------------------
-- Antes, los límites del plan gratuito vivían en una constante de
-- código (lib/plans.ts) — cambiarlos exigía tocar código y redesplegar,
-- a diferencia de todo lo demás (Premium, packs), que ya era editable
-- desde /admin/productos. Esta tabla cierra esa inconsistencia.
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Lectura pública (son límites de producto, no datos sensibles);
-- escritura solo admin.
create policy "app_settings_select_any" on public.app_settings for select using (true);
create policy "app_settings_admin_write" on public.app_settings for all using (public.is_admin(auth.uid()));

create trigger trg_app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (key, value) values
  ('free_plan', jsonb_build_object(
    'maxAlbums', 1,
    'photoLimit', 30,
    'videoLimit', 5,
    'storageLimitMb', 500
  ))
on conflict (key) do nothing;
