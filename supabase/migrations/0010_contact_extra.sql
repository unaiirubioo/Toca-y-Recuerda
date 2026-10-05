-- =====================================================================
-- Toca y Recuerda — 0010: categorías, título y foto adjunta en contacto
-- =====================================================================

alter table public.contact_messages
  add column if not exists title text,
  add column if not exists category text not null default 'otro',
  add column if not exists photo_path text;

comment on column public.contact_messages.title is 'Asunto corto que escribe quien contacta.';
comment on column public.contact_messages.category is 'Consulta_general | soporte_tecnico | pedido_facturacion | nfc_album | sugerencia | otro.';
comment on column public.contact_messages.photo_path is 'Ruta dentro del bucket privado contact-attachments, si adjuntó una foto. Solo el admin puede leerla (vía URL firmada).';

-- Bucket PRIVADO (spec: "esa foto la tengo que ver yo que soy el
-- administrador") — a diferencia de album-media, aquí nunca hay
-- lectura pública: ni siquiera quien la envió puede volver a verla
-- por una URL directa. El admin la ve mediante una URL firmada que
-- genera el servidor con la service_role key.
insert into storage.buckets (id, name, public, file_size_limit)
values ('contact-attachments', 'contact-attachments', false, 10485760) -- 10 MB
on conflict (id) do nothing;

-- Sin ninguna policy de SELECT/INSERT para anon/authenticated: por
-- defecto, con RLS activado (ya lo está en storage.objects desde el
-- propio Supabase), nadie puede leer ni escribir aquí salvo el
-- service_role (que salta RLS) — que es justo como se sube la foto
-- (desde la Server Action de contacto, con el cliente admin) y como el
-- admin la consulta (también con el cliente admin, vía URL firmada).
