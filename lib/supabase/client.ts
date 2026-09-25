import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para Client Components.
 * Usa la anon key: todo lo que haga pasa por las políticas RLS del usuario
 * autenticado (o del rol "anon" si no hay sesión). Nunca lleva la
 * service_role key.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
