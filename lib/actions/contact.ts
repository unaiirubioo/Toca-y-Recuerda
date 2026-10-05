"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";

const schema = z.object({
  name: z.string().trim().min(2, "Dinos cómo te llamas.").max(100),
  email: z.string().trim().email("Ese correo no parece válido."),
  message: z.string().trim().min(10, "Cuéntanos un poco más.").max(4000),
});

export type ContactResult = { error: string } | { ok: true };

export async function submitContactMessage(formData: FormData): Promise<ContactResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el formulario." };

  const ip = await getClientIp();
  const limit = checkRateLimit(`contact:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return { error: "Has enviado varios mensajes seguidos. Espera unos minutos." };

  const admin = createAdminClient();
  const { error } = await admin.from("contact_messages").insert(parsed.data);
  if (error) {
    console.error("submitContactMessage:", error.message);
    return { error: "No hemos podido enviar tu mensaje. Inténtalo otra vez." };
  }

  return { ok: true };
}
