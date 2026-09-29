import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Comprueba en el servidor que quien hace la petición es admin.
 * Se usa en el layout de /admin Y en cada consulta/acción de admin
 * (defensa en profundidad: las consultas usan la service_role key,
 * que se salta RLS, así que NUNCA pueden ejecutarse sin esta barrera).
 *
 * Si no hay sesión o no es admin => 404 (no se revela que /admin existe).
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", userData.user.id)
    .single();

  const p = profile as { role?: string; is_blocked?: boolean } | null;
  if (!p || p.role !== "admin" || p.is_blocked) notFound();

  return { userId: userData.user.id };
}
