import { LegalPageShell } from "@/components/legal/legal-page-shell";

export default function CookiesPage() {
  return (
    <LegalPageShell title="Política de cookies">
      <p>
        Usamos únicamente cookies técnicas esenciales: la sesión de
        inicio de sesión (Supabase Auth) y el aviso de esta misma
        política. No usamos cookies de publicidad ni de seguimiento de
        terceros en esta versión de la plataforma.
      </p>
      <p>
        [Placeholder] Si en el futuro se añade analítica de terceros o
        publicidad, esta página debe actualizarse detallando cada cookie,
        su finalidad, duración y cómo rechazarla.
      </p>
    </LegalPageShell>
  );
}
