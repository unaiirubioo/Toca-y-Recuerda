-- =====================================================================
-- Toca y Recuerda — 0007: regalar packs a un usuario desde /admin
-- =====================================================================

-- Marca los pedidos creados a mano por un admin (regalo/cortesía) y
-- quién lo hizo, para que quede rastro — nunca se confunden con una
-- compra real de Stripe (esos pedidos no tienen stripe_payment_intent_id).
alter table public.orders
  add column if not exists is_gift boolean not null default false,
  add column if not exists granted_by uuid references public.profiles(id);
