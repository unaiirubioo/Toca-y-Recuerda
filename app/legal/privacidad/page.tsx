import { LegalPageShell } from "@/components/legal/legal-page-shell";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Política de privacidad">
      <p>
        Toca y Recuerda ("nosotros") respeta tu privacidad. Este documento
        describe, de forma orientativa, qué datos tratamos y con qué fin:
        cuenta de usuario (nombre, email), contenido que subes (fotos,
        vídeos, textos, ubicación), y datos de pago procesados por Stripe
        (nunca almacenamos números de tarjeta).
      </p>
      <p>
        [Placeholder] Aquí debe detallarse: base legal del tratamiento,
        plazos de conservación, encargados del tratamiento (Supabase,
        Stripe, proveedor de hosting), derechos de las personas usuarias
        (acceso, rectificación, supresión, portabilidad) y cómo ejercerlos,
        y transferencias internacionales de datos si las hubiera.
      </p>
    </LegalPageShell>
  );
}
