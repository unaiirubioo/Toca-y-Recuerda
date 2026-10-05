-- =====================================================================
-- Toca y Recuerda — 0006: NFC autogenerado por el usuario + arreglos
-- =====================================================================

-- Distingue un NFC creado por el propio usuario desde "Ajustes de mi
-- cuenta" (sin chip físico enviado por nosotros) de uno de nuestro
-- inventario físico. Sirve para mostrarlo claramente en /admin/nfc.
alter table public.nfc_tags
  add column if not exists self_generated boolean not null default false;

create index if not exists idx_nfc_tags_self_generated
  on public.nfc_tags(owner_id) where self_generated = true;
