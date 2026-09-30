"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  signUpSchema,
  signInSchema,
  requestPasswordResetSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";

const PENDING_NFC_COOKIE = "pending_nfc_token";
const PENDING_VERIFY_EMAIL_COOKIE = "pending_verify_email";
const PENDING_VERIFY_UID_COOKIE = "pending_verify_uid";

export type ActionResult = { error: string } | { error?: undefined };

function friendlyAuthError(message: string): string {
  // Traducimos los mensajes técnicos de Supabase a microcopy humano (spec #38).
  if (message.includes("Invalid login credentials")) {
    return "Ese email o contraseña no son correctos.";
  }
  if (message.includes("User already registered")) {
    return "Ya existe una cuenta con ese email. Prueba a iniciar sesión.";
  }
  if (message.includes("Email not confirmed")) {
    return "Todavía no has confirmado tu email. Revisa tu bandeja de entrada.";
  }
  return "Ha ocurrido un problema. Inténtalo de nuevo en unos segundos.";
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const ip = await getClientIp();
  const limit = checkRateLimit(`signup:${ip}`, 8, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Demasiados intentos de registro. Prueba de nuevo en un rato." };
  }

  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: friendlyAuthError(error.message) };

  const cookieStore = await cookies();

  const nfc = formData.get("nfc");
  if (typeof nfc === "string" && nfc.length > 0) {
    cookieStore.set(PENDING_NFC_COOKIE, nfc, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  }

  // Guardamos email + uid del registro pendiente de confirmar: los
  // necesita la pantalla "revisa tu email" para el botón "ya he
  // verificado" y para reenviar el correo (spec).
  if (data.user) {
    cookieStore.set(PENDING_VERIFY_EMAIL_COOKIE, parsed.data.email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    cookieStore.set(PENDING_VERIFY_UID_COOKIE, data.user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  redirect("/registro/revisa-tu-email");
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos del formulario." };
  }

  const ip = await getClientIp();
  const byEmail = checkRateLimit(`login:email:${parsed.data.email.toLowerCase()}`, 10, 15 * 60 * 1000);
  const byIp = checkRateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000);
  if (!byEmail.allowed || !byIp.allowed) {
    return { error: "Demasiados intentos. Espera unos minutos antes de volver a probar." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { error: friendlyAuthError(error.message) };

  const nfcFromForm = formData.get("nfc");
  const cookieStore = await cookies();
  const nfc = (typeof nfcFromForm === "string" && nfcFromForm) || cookieStore.get(PENDING_NFC_COOKIE)?.value;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .single();

  revalidatePath("/", "layout");

  if (nfc) {
    cookieStore.delete(PENDING_NFC_COOKIE);
    redirect(`/albumes/nuevo?nfc=${encodeURIComponent(nfc)}`);
  }

  redirect((profile as any)?.onboarding_completed ? "/dashboard" : "/onboarding");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Escribe un email válido." };
  }

  const limit = checkRateLimit(`reset:${parsed.data.email.toLowerCase()}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Ya has solicitado varios enlaces. Revisa tu email o espera un poco." };
  }

  const supabase = await createClient();
  // No revelamos si el email existe o no en la respuesta (evita enumeración de usuarios).
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/actualizar-password`,
  });

  redirect("/recuperar/revisa-tu-email");
}

export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({ password: formData.get("password") });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "La contraseña no es válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { error: "No hemos podido actualizar tu contraseña. Inténtalo otra vez." };

  redirect("/dashboard");
}

export type VerifyCheckResult =
  | { status: "verified"; nfc: string | null }
  | { status: "not-verified" }
  | { status: "error"; error: string };

/**
 * Botón "Ya he verificado mi correo" de la pantalla de espera (spec):
 * comprueba si el email ya está confirmado y, si lo está, inicia
 * sesión directamente sin pedir la contraseña otra vez — usando el
 * mismo mecanismo interno que un enlace de email (un token de un solo
 * uso generado por el propio servidor, nunca la contraseña guardada,
 * que no conservamos).
 */
export async function checkEmailVerifiedAndSignIn(): Promise<VerifyCheckResult> {
  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_VERIFY_EMAIL_COOKIE)?.value;
  const uid = cookieStore.get(PENDING_VERIFY_UID_COOKIE)?.value;
  if (!email || !uid) return { status: "error", error: "No encontramos tu registro pendiente. Prueba a iniciar sesión." };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: userRes, error: userError } = await admin.auth.admin.getUserById(uid);
  if (userError || !userRes.user) return { status: "error", error: "No hemos podido comprobar tu registro." };
  if (!userRes.user.email_confirmed_at) return { status: "not-verified" };

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    return { status: "error", error: "Tu correo está verificado, pero no hemos podido iniciar tu sesión. Inicia sesión manualmente." };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });
  if (verifyError) {
    return { status: "error", error: "Tu correo está verificado, pero no hemos podido iniciar tu sesión. Inicia sesión manualmente." };
  }

  const nfc = cookieStore.get(PENDING_NFC_COOKIE)?.value ?? null;
  cookieStore.delete(PENDING_VERIFY_EMAIL_COOKIE);
  cookieStore.delete(PENDING_VERIFY_UID_COOKIE);
  revalidatePath("/", "layout");

  return { status: "verified", nfc };
}

/** Botón "Reenviar correo de verificación" de la pantalla de espera. */
export async function resendVerificationEmail(): Promise<ActionResult> {
  const cookieStore = await cookies();
  const email = cookieStore.get(PENDING_VERIFY_EMAIL_COOKIE)?.value;
  if (!email) return { error: "No encontramos tu registro pendiente. Prueba a registrarte de nuevo." };

  const limit = checkRateLimit(`resend-verify:${email.toLowerCase()}`, 4, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { error: "Ya has pedido varios reenvíos. Espera unos minutos y revisa también el spam." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (error) {
    // Antes se tragaba el motivo real y siempre mostraba el mismo
    // mensaje genérico — así nunca se sabía si era un límite de
    // Supabase, el correo ya verificado, o un fallo de verdad.
    console.error("resendVerificationEmail:", error.status, error.message);

    if (error.message.toLowerCase().includes("already confirmed")) {
      return { error: "Ese correo ya está verificado — prueba a iniciar sesión directamente." };
    }
    if (error.status === 429 || error.message.toLowerCase().includes("rate limit")) {
      return { error: "Supabase ha limitado el envío de correos por ahora. Espera un minuto y vuelve a intentarlo." };
    }
    return { error: `No hemos podido reenviar el correo (${error.message}).` };
  }

  return {};
}

export type CompleteSessionResult = { error: string } | { ok: true; nfc: string | null };

/**
 * Completa el inicio de sesión a partir de los tokens que llegaron en
 * el fragmento de la URL (`#access_token=...`) cuando Supabase usa el
 * flujo "implícito" para el enlace de verificación (spec #3). Un
 * componente cliente lee ese fragmento —invisible para el servidor— y
 * llama aquí; como esto es un Server Action, sí puede escribir la
 * cookie de sesión (una página normal no podría).
 */
export async function completeSessionFromTokens(
  accessToken: string,
  refreshToken: string
): Promise<CompleteSessionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) {
    console.error("completeSessionFromTokens:", error.message);
    return { error: "Ese enlace ya no es válido. Pide que te reenvíen el correo." };
  }

  const cookieStore = await cookies();
  const nfc = cookieStore.get(PENDING_NFC_COOKIE)?.value ?? null;
  cookieStore.delete(PENDING_VERIFY_EMAIL_COOKIE);
  cookieStore.delete(PENDING_VERIFY_UID_COOKIE);

  return { ok: true, nfc };
}

export async function updateMyName(formData: FormData): Promise<ActionResult> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (fullName.length < 2) return { error: "Escribe un nombre válido." };
  if (fullName.length > 80) return { error: "Ese nombre es demasiado largo." };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", userData.user.id);
  if (error) return { error: "No hemos podido guardar tu nombre. Inténtalo otra vez." };

  revalidatePath("/cuenta");
  revalidatePath("/dashboard");
  return {};
}
