import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirige aquí tanto tras confirmar el email de registro como
// tras pulsar el enlace de "recuperar contraseña". El parámetro `next`
// decide a dónde va el usuario después de intercambiar el código.
//
// Aceptamos DOS formatos, porque cuál usa Supabase depende de la
// configuración del proyecto (flujo PKCE con `code`, o el flujo OTP
// clásico con `token_hash`+`type` que usan por defecto muchas plantillas
// de email de Supabase). Antes solo se manejaba `code`: con el otro
// formato, Supabase confirmaba el email pero esta ruta nunca llegaba a
// crear la sesión, así que el usuario tenía que volver a iniciar sesión
// a mano después de verificar (spec: arreglar esto).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/onboarding";

  const supabase = await createClient();
  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "signup" | "email" | "recovery" | "email_change" | "invite" | "magiclink",
    });
    verified = !error;
  }

  if (verified) {
    const pendingNfc = request.cookies.get("pending_nfc_token")?.value;

    // El enlace de confirmación de registro siempre debe pasar primero
    // por la pantalla de "correo verificado" (spec), salvo que venga de
    // un flujo distinto (recuperar contraseña) que ya especifica su
    // propio `next`.
    if (searchParams.get("next")) {
      const destination = pendingNfc && next === "/onboarding" ? `${next}?nfc=${encodeURIComponent(pendingNfc)}` : next;
      return NextResponse.redirect(`${origin}${destination}`);
    }

    const verifiedUrl = new URL(`${origin}/correo-verificado`);
    if (pendingNfc) verifiedUrl.searchParams.set("nfc", pendingNfc);
    return NextResponse.redirect(verifiedUrl);
  }

  return NextResponse.redirect(`${origin}/login?error=enlace-invalido`);
}
