import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirige aquí tanto tras confirmar el email de registro como
// tras pulsar el enlace de "recuperar contraseña". El parámetro `next`
// decide a dónde va el usuario después de intercambiar el código.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const pendingNfc = request.cookies.get("pending_nfc_token")?.value;
      const destination = pendingNfc && next === "/onboarding" ? `${next}?nfc=${encodeURIComponent(pendingNfc)}` : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=enlace-invalido`);
}
