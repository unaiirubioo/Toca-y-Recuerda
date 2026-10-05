import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Comprueba que la app responde Y que la base de datos es alcanzable.
 * Útil para un monitor de uptime externo antes de anunciar producción.
 */
export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("products").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;

    return NextResponse.json({ status: "ok", database: "reachable", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "error", database: "unreachable", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
