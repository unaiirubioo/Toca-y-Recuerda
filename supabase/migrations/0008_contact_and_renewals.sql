-- =====================================================================
-- Toca y Recuerda — 0008: formulario de contacto + renovación cada 5 años
-- =====================================================================

-- Mensajes del formulario de contacto público (spec). Sin proveedor de
-- email propio configurado todavía, así que de momento se guardan aquí
-- para que un admin los revise directamente en Supabase o desde /admin.
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "contact_messages_admin_read" on public.contact_messages
  for select using (public.is_admin(auth.uid()));

-- Conservación de archivos cada 5 años (spec #10): cada álbum guarda
-- cuándo le toca renovar. Se fija la primera vez al publicarlo.
-- `renewal_reminder_sent_at` evita mandar el aviso de "faltan 30 días"
-- más de una vez por ciclo.
alter table public.albums
  add column if not exists renewal_due_at timestamptz,
  add column if not exists renewal_reminder_sent_at timestamptz;

create index if not exists idx_albums_renewal_due_at
  on public.albums(renewal_due_at) where status = 'published';

-- Un pedido de renovación paga por un álbum concreto, no por créditos
-- nuevos (album_credits/nfc_credits del producto RENEWAL son 0, así
-- que el reparto automático de fulfillPaidOrder no hace nada raro con
-- él) — esta columna le dice al webhook A CUÁL álbum hay que alargarle
-- la fecha de renovación cuando se confirme el pago.
alter table public.orders
  add column if not exists renewal_album_id uuid references public.albums(id);

insert into public.products (slug, type, name, description, price_cents, album_credits, nfc_credits, active)
values (
  'RENEWAL',
  'premium_upgrade',
  'Renovación de álbum (5 años más)',
  'Mantén tu álbum y tus fotos disponibles 5 años más.',
  (select price_cents from public.products where slug = 'PREMIUM' limit 1),
  0,
  0,
  true
)
on conflict (slug) do nothing;
