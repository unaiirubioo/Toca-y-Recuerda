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
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) return { error: friendlyAuthError(error.message) };

  const nfc = formData.get("nfc");
  if (typeof nfc === "string" && nfc.length > 0) {
    const cookieStore = await cookies();
    cookieStore.set(PENDING_NFC_COOKIE, nfc, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
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
