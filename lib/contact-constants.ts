/**
 * Constantes del formulario de contacto, compartidas entre el
 * formulario público, la Server Action que lo procesa y el panel de
 * admin. Van en un archivo aparte (sin "use server") porque un
 * archivo "use server" solo puede exportar funciones async — exportar
 * aquí un const rompía el build ("Only async functions are allowed to
 * be exported in a 'use server' file").
 */
export const CONTACT_BUCKET = "contact-attachments";

// Categorías del formulario de contacto (spec: "varias opciones en
// plan categorías, las que veas tú") — ayudan a priorizar de un
// vistazo qué tipo de mensaje es antes de abrirlo.
export const CONTACT_CATEGORIES = [
  { value: "consulta_general", label: "Consulta general" },
  { value: "soporte_tecnico", label: "Problema técnico con la web" },
  { value: "pedido_facturacion", label: "Pedido o facturación" },
  { value: "nfc_album", label: "Problema con un NFC o un álbum" },
  { value: "sugerencia", label: "Sugerencia" },
  { value: "otro", label: "Otro" },
] as const;
