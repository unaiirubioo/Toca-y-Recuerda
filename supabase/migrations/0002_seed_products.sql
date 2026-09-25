-- =====================================================================
-- Toca y Recuerda — Seed de catálogo de productos (spec #77)
-- =====================================================================
-- Precios en céntimos de EUR. Editable después desde /admin (spec #56).

insert into public.products
  (slug, name, description, type, price_cents, album_credits, nfc_credits, photo_limit, video_limit, storage_limit_mb, shipping_included, sort_order)
values
  ('PREMIUM', 'Álbum Premium', 'Desbloquea un álbum: 500 fotos, 20 vídeos, 5 GB. Pago único, para siempre.',
    'premium_upgrade', 499, 1, 0, 500, 20, 5120, true, 10),

  ('PACK_5', 'Pack 5 álbumes', '5 álbumes Premium, cada uno con 500 fotos, 20 vídeos y 5 GB.',
    'album_pack', 1799, 5, 0, 500, 20, 5120, true, 20),

  ('PACK_10', 'Pack 10 álbumes', '10 álbumes Premium, cada uno con 500 fotos, 20 vídeos y 5 GB.',
    'album_pack', 2999, 10, 0, 500, 20, 5120, true, 30),

  ('ALBUM_EXTRA', 'Álbum adicional', 'Un álbum Premium adicional para quien ya tiene un pack.',
    'album_pack', 499, 1, 0, 500, 20, 5120, true, 40),

  ('NFC_1', '1 NFC', 'Un NFC físico, preparado y listo para asociar. Envío incluido.',
    'nfc_pack', 799, 0, 1, null, null, null, true, 50),

  ('NFC_3', 'Pack 3 NFC', 'Tres NFC físicos. Envío incluido.',
    'nfc_pack', 1999, 0, 3, null, null, null, true, 60),

  ('NFC_5', 'Pack 5 NFC', 'Cinco NFC físicos. Envío incluido.',
    'nfc_pack', 2999, 0, 5, null, null, null, true, 70),

  ('NFC_10', 'Pack 10 NFC', 'Diez NFC físicos. Envío incluido.',
    'nfc_pack', 4999, 0, 10, null, null, null, true, 80),

  ('PACK_RECUERDO', 'Pack Recuerdo', '1 NFC + 1 álbum Premium. Envío incluido.',
    'combo_pack', 1199, 1, 1, 500, 20, 5120, true, 90),

  ('PACK_VIAJES', 'Pack Viajes', '3 NFC + 3 álbumes Premium. Envío incluido.',
    'combo_pack', 3299, 3, 3, 500, 20, 5120, true, 100),

  ('PACK_COLECCION', 'Pack Colección', '5 NFC + 5 álbumes Premium. Envío incluido.',
    'combo_pack', 4999, 5, 5, 500, 20, 5120, true, 110),

  ('PACK_GRAN_COLECCION', 'Pack Gran Colección', '10 NFC + 10 álbumes Premium. Envío incluido.',
    'combo_pack', 7999, 10, 10, 500, 20, 5120, true, 120);

-- Nota: el plan FREE (0 €, 1 álbum, 30 fotos, 5 vídeos, 500 MB) no es un
-- "producto" comprable — es el estado por defecto de cualquier álbum nuevo
-- sin crédito Premium consumido. Sus límites viven como constantes en
-- lib/plans.ts (Fase 4) para no depender de una fila de producto con precio 0.
