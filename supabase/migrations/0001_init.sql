-- =====================================================================
-- Toca y Recuerda — Migración inicial (Fase 1)
-- =====================================================================
-- Esta migración crea el esquema completo de la Fase 1: usuarios,
-- productos, créditos, álbumes, medios, NFC, pedidos y pagos.
-- La seguridad avanzada (rate limiting, hardening extra) se completa
-- en la Fase 13, pero las políticas RLS base se crean ya aquí porque
-- son parte fundamental de la arquitectura (spec #45/#46).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type user_role as enum ('user', 'admin');
create type album_privacy as enum ('public', 'private');
create type album_status as enum ('draft', 'published');
create type media_type as enum ('photo', 'video');
create type product_type as enum (
  'premium_upgrade',   -- desbloqueo Premium de 1 álbum
  'album_pack',        -- pack de créditos de álbum Premium (5, 10, adicional)
  'nfc_pack',          -- pack de NFC físicos (1, 3, 5, 10)
  'combo_pack'         -- pack combinado NFC + álbumes (Recuerdo, Viajes, Colección, Gran Colección)
);
create type order_status as enum ('pending', 'paid', 'failed', 'refunded');
create type nfc_status as enum ('stock', 'reserved', 'sold', 'assigned', 'active', 'disabled');
create type nfc_order_status as enum ('pendiente', 'preparando', 'programado', 'enviado', 'entregado');

-- ---------------------------------------------------------------------
-- PROFILES (extiende auth.users de Supabase)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'user',
  onboarding_completed boolean not null default false,
  onboarding_intent text, -- 'viaje' | 'momento_especial' | 'lugar' | 'familia' | 'recuerdos' | 'otro' (solo personalización, spec #8)
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil de usuario, 1:1 con auth.users. El rol admin se gestiona aquí, no en auth.users.';

-- ---------------------------------------------------------------------
-- PRODUCTS (catálogo configurable — spec #56, nunca hardcodear precios)
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique, -- FREE, PREMIUM, PACK_5, PACK_10, ALBUM_EXTRA, NFC_1, NFC_3, NFC_5, NFC_10, PACK_RECUERDO, PACK_VIAJES, PACK_COLECCION, PACK_GRAN_COLECCION
  name text not null,
  description text,
  type product_type not null,
  price_cents integer not null, -- importe en céntimos de EUR para evitar errores de coma flotante
  currency text not null default 'EUR',
  album_credits integer not null default 0,   -- nº de créditos de álbum Premium que otorga
  nfc_credits integer not null default 0,     -- nº de NFC físicos que otorga
  photo_limit integer,       -- límite de fotos por álbum que este producto concede (null = no aplica)
  video_limit integer,
  storage_limit_mb integer,
  shipping_included boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.products is 'Catálogo de productos configurable desde /admin. Precios y límites nunca se hardcodean en el código (spec #56).';

-- ---------------------------------------------------------------------
-- CREDITS (créditos consumibles de álbum Premium y NFC — spec #58/#59)
-- ---------------------------------------------------------------------
create table public.album_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_order_id uuid, -- referencia a orders, se añade FK tras crear la tabla orders
  photo_limit integer not null,
  video_limit integer not null,
  storage_limit_mb integer not null,
  consumed boolean not null default false,
  consumed_by_album_id uuid, -- se rellena al usarse
  created_at timestamptz not null default now()
);

comment on table public.album_credits is 'Cada fila es "un álbum Premium disponible para usar". Se consume al crear o al mejorar un álbum.';

create table public.nfc_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_order_id uuid,
  consumed boolean not null default false,
  consumed_by_nfc_id uuid,
  created_at timestamptz not null default now()
);

comment on table public.nfc_credits is 'Cada fila es "un NFC físico pendiente de asignar" tras una compra.';

-- ---------------------------------------------------------------------
-- ALBUMS
-- ---------------------------------------------------------------------
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  public_slug text not null unique, -- para /album/<slug> cuando no hay NFC (spec #49)
  title text not null,
  description text,
  cover_media_id uuid, -- FK a album_media, se añade tras crear esa tabla
  event_date_start date,
  event_date_end date,
  location_name text,
  location_lat double precision,
  location_lng double precision,
  design_theme text not null default 'classic',
  design_font text not null default 'default',
  design_layout text not null default 'grid',
  music_url text,
  music_title text,
  privacy album_privacy not null default 'private',
  privacy_password_hash text, -- solo si privacy = 'private' y el usuario define contraseña
  status album_status not null default 'draft',
  is_premium boolean not null default false,
  photo_limit integer not null default 30,   -- copiado desde el plan/crédito en el momento de crear (spec #10)
  video_limit integer not null default 5,
  storage_limit_mb integer not null default 500,
  storage_used_mb numeric(10, 2) not null default 0,
  photo_count integer not null default 0,
  video_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.albums is 'Un álbum puede existir sin NFC asociado (spec #48/#49). Los límites se copian al crear el álbum para no depender de cambios futuros en el plan.';

-- ---------------------------------------------------------------------
-- ALBUM_MEDIA (fotos y vídeos — metadatos únicamente, los binarios van a Storage)
-- ---------------------------------------------------------------------
create table public.album_media (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  type media_type not null,
  storage_path text not null, -- ruta dentro del bucket de Supabase Storage
  thumbnail_path text,
  file_name text not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds integer, -- solo vídeos
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.albums
  add constraint albums_cover_media_fk
  foreign key (cover_media_id) references public.album_media(id) on delete set null;

-- ---------------------------------------------------------------------
-- ALBUM_MEMORIES (textos/recuerdos — separado de la descripción principal)
-- ---------------------------------------------------------------------
create table public.album_memories (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  content text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NFC_TAGS (spec #47)
-- ---------------------------------------------------------------------
create table public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique, -- token largo, aleatorio, no predecible -> /n/<public_token>
  status nfc_status not null default 'stock',
  owner_id uuid references public.profiles(id) on delete set null,
  album_id uuid references public.albums(id) on delete set null,
  order_id uuid, -- FK se añade tras crear orders
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.nfc_tags is 'El NFC físico solo guarda la URL https://tocayrecuerda.com/n/<public_token>. Esa URL nunca cambia una vez programada (spec #6/#26).';

-- ---------------------------------------------------------------------
-- SHIPPING_ADDRESSES
-- ---------------------------------------------------------------------
create table public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  province text,
  postal_code text not null,
  country text not null default 'ES',
  phone text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ORDERS / ORDER_ITEMS / PAYMENTS (spec #21/#22/#57)
-- ---------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status order_status not null default 'pending',
  total_cents integer not null,
  currency text not null default 'EUR',
  shipping_address_id uuid references public.shipping_addresses(id),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.album_credits
  add constraint album_credits_order_fk foreign key (source_order_id) references public.orders(id) on delete set null;
alter table public.nfc_credits
  add constraint nfc_credits_order_fk foreign key (source_order_id) references public.orders(id) on delete set null;
alter table public.nfc_tags
  add constraint nfc_tags_order_fk foreign key (order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1,
  unit_price_cents integer not null,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  stripe_payment_intent_id text not null unique,
  amount_cents integer not null,
  currency text not null default 'EUR',
  status text not null, -- refleja el estado bruto de Stripe (succeeded, requires_action, etc.)
  raw_event jsonb, -- payload del webhook para auditoría/depuración
  created_at timestamptz not null default now()
);

-- Tabla de idempotencia de webhooks de Stripe (spec #74)
create table public.stripe_webhook_events (
  id text primary key, -- Stripe event.id
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NFC_ORDER_TRACKING (estado logístico específico de NFC — spec #22/#60)
-- ---------------------------------------------------------------------
create table public.nfc_fulfillment (
  id uuid primary key default gen_random_uuid(),
  nfc_id uuid not null references public.nfc_tags(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  status nfc_order_status not null default 'pendiente',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ANALYTICS_EVENTS (spec #52, sin datos personales innecesarios)
-- ---------------------------------------------------------------------
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null, -- page_view, signup, album_created, purchase_completed, nfc_scanned, etc.
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ÍNDICES
-- ---------------------------------------------------------------------
create index idx_albums_owner on public.albums(owner_id);
create index idx_album_media_album on public.album_media(album_id);
create index idx_album_memories_album on public.album_memories(album_id);
create index idx_nfc_tags_owner on public.nfc_tags(owner_id);
create index idx_nfc_tags_album on public.nfc_tags(album_id);
create index idx_nfc_tags_status on public.nfc_tags(status);
create index idx_orders_user on public.orders(user_id);
create index idx_order_items_order on public.order_items(order_id);
create index idx_album_credits_user on public.album_credits(user_id) where consumed = false;
create index idx_nfc_credits_user on public.nfc_credits(user_id) where consumed = false;
create index idx_analytics_event_name on public.analytics_events(event_name);

-- ---------------------------------------------------------------------
-- FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_albums_updated_at before update on public.albums
  for each row execute function public.set_updated_at();
create trigger trg_nfc_tags_updated_at before update on public.nfc_tags
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Crea automáticamente el profile al registrarse un usuario en auth.users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- ROW LEVEL SECURITY (base — se refuerza en Fase 13)
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.album_credits enable row level security;
alter table public.nfc_credits enable row level security;
alter table public.albums enable row level security;
alter table public.album_media enable row level security;
alter table public.album_memories enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.shipping_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.nfc_fulfillment enable row level security;
alter table public.analytics_events enable row level security;
alter table public.stripe_webhook_events enable row level security;

-- PROFILES: cada usuario ve y edita el suyo; los admin ven todos.
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());
create policy "profiles_admin_update_any" on public.profiles
  for update using (public.is_admin(auth.uid()));

-- PRODUCTS: lectura pública de productos activos; escritura solo admin.
create policy "products_select_active" on public.products
  for select using (active = true or public.is_admin(auth.uid()));
create policy "products_admin_write" on public.products
  for all using (public.is_admin(auth.uid()));

-- CREDITS: el usuario solo ve/consume los suyos.
create policy "album_credits_owner" on public.album_credits
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "nfc_credits_owner" on public.nfc_credits
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- ALBUMS: el propietario tiene control total. Público solo si status=published y privacy=public.
-- El acceso a álbumes privados vía /n/<token> o contraseña se resuelve en el backend
-- con una Server Action que usa la service_role key, NO directamente vía RLS del cliente.
create policy "albums_owner_all" on public.albums
  for all using (owner_id = auth.uid() or public.is_admin(auth.uid()));
create policy "albums_public_read" on public.albums
  for select using (status = 'published' and privacy = 'public');

-- ALBUM_MEDIA / ALBUM_MEMORIES: heredan la visibilidad del álbum.
create policy "album_media_owner_all" on public.album_media
  for all using (
    exists (select 1 from public.albums a where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin(auth.uid())))
  );
create policy "album_media_public_read" on public.album_media
  for select using (
    exists (select 1 from public.albums a where a.id = album_id and a.status = 'published' and a.privacy = 'public')
  );
create policy "album_memories_owner_all" on public.album_memories
  for all using (
    exists (select 1 from public.albums a where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin(auth.uid())))
  );
create policy "album_memories_public_read" on public.album_memories
  for select using (
    exists (select 1 from public.albums a where a.id = album_id and a.status = 'published' and a.privacy = 'public')
  );

-- NFC_TAGS: el propietario ve los suyos; el resto solo admin. La resolución
-- de /n/<token> para visitantes anónimos se hace en el backend (service_role),
-- nunca dejando que el cliente lea toda la tabla nfc_tags.
create policy "nfc_tags_owner_read" on public.nfc_tags
  for select using (owner_id = auth.uid() or public.is_admin(auth.uid()));
create policy "nfc_tags_admin_write" on public.nfc_tags
  for all using (public.is_admin(auth.uid()));
create policy "nfc_tags_owner_update_album_link" on public.nfc_tags
  for update using (owner_id = auth.uid());

-- SHIPPING_ADDRESSES / ORDERS / ORDER_ITEMS / PAYMENTS: solo el propietario y admin.
create policy "shipping_addresses_owner" on public.shipping_addresses
  for all using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "orders_owner_read" on public.orders
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "orders_admin_write" on public.orders
  for all using (public.is_admin(auth.uid()));
create policy "order_items_owner_read" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin(auth.uid())))
  );
create policy "payments_admin_only" on public.payments
  for all using (public.is_admin(auth.uid()));
create policy "nfc_fulfillment_admin_only" on public.nfc_fulfillment
  for all using (public.is_admin(auth.uid()));
create policy "webhook_events_admin_only" on public.stripe_webhook_events
  for all using (public.is_admin(auth.uid()));

-- ANALYTICS_EVENTS: inserción abierta (server-side), lectura solo admin.
create policy "analytics_insert_any" on public.analytics_events
  for insert with check (true);
create policy "analytics_admin_read" on public.analytics_events
  for select using (public.is_admin(auth.uid()));
