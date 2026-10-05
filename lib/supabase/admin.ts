import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://couaplfkiguviesiqpri.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createSupabaseClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: { persistSession: false },
      // CRÍTICO: Next.js 14 cachea automáticamente cualquier fetch()
      // del lado servidor, y supabase-js usa fetch() por debajo sin
      // desactivarlo. Sin esto, lecturas como "¿es público o privado
      // este álbum?" o "¿cuál es la contraseña guardada?" podían
      // quedarse congeladas con datos antiguos indefinidamente — la
      // causa real de varios bugs de "edito algo y no se actualiza".
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}