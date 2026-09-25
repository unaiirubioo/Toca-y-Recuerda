import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente "admin" con la service_role key: ignora RLS por completo.
 *
 * SOLO se importa desde código que corre exclusivamente en el servidor
 * (Route Handlers de webhooks, Server Actions muy concretas como la
 * resolución pública de /n/[token] para visitantes anónimos, y el panel
 * /admin). Nunca importar este archivo desde un componente que pueda
 * acabar en el bundle de cliente.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );
}
