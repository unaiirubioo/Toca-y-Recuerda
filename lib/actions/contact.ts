"use server";

import { z } from "zod";
import { nanoid } from "nanoid";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";
import { sendEmail } from "@/lib/email/resend";
import { CONTACT_BUCKET, CONTACT_CATEGORIES } from "@/lib/contact-constants";

// A dónde te llega el aviso de "alguien ha escrito por contacto". Se
// puede cambiar sin tocar código con la variable de entorno
// CONTACT_NOTIFICATION_EMAIL en Vercel — si no existe o está vacía
// (por eso `||` y no `??`), se usa esta por defecto.
const NOTIFICATION_EMAIL = process.env.CONTACT_NOTIFICATION_EMAIL || "unairubiocr@gmail.com";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB — igual que el límite del bucket (migración 0010)
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/gif"];
const CATEGORY_VALUES = CONTACT_CATEGORIES.map((c) => c.value) as [string, ...string[]];

const schema = z.object({
  name: z.string().trim().min(2, "Dinos cómo te llamas.").max(100),
  email: z.string().trim().email("Ese correo no parece válido."),
  title: z.string().trim().min(3, "Ponle un título corto a tu mensaje.").max(150),
  category: z.enum(CATEGORY_VALUES),
  message: z.string().trim().min(10, "Cuéntanos un poco más.").max(4000),
});

export type ContactResult = { error: string } | { ok: true };

export async function submitContactMessage(formData: FormData): Promise<ContactResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    title: formData.get("title"),
    category: formData.get("category"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa el formulario." };

  const ip = await getClientIp();
  const limit = checkRateLimit(`contact:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) return { error: "Has enviado varios mensajes seguidos. Espera unos minutos." };

  // La foto es opcional (spec: "la posibilidad de añadir una foto").
  // Se sube a un bucket PRIVADO — nunca público — así que solo el
  // admin puede llegar a verla, con una URL firmada generada por el
  // servidor (ver listContactMessages).
  const admin = createAdminClient();
  let photoPath: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    if (!ACCEPTED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Esa foto no tiene un formato admitido (JPG, PNG, WEBP, HEIC o GIF)." };
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: "Esa foto pesa demasiado (máximo 10 MB)." };
    }
    const ext = photo.type.split("/")[1] ?? "jpg";
    const path = `${nanoid(16)}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from(CONTACT_BUCKET)
      .upload(path, await photo.arrayBuffer(), { contentType: photo.type });
    if (uploadError) {
      console.error("submitContactMessage: fallo al subir la foto —", uploadError.message);
      return { error: "No hemos podido subir la foto. Inténtalo otra vez." };
    }
    photoPath = path;
  }

  const { name, email, title, category, message } = parsed.data;

  const { error } = await admin
    .from("contact_messages")
    .insert({ name, email, title, category, message, photo_path: photoPath });
  if (error) {
    console.error("submitContactMessage:", error.message);
    return { error: "No hemos podido enviar tu mensaje. Inténtalo otra vez." };
  }

  // Si adjuntó foto, una URL firmada para poder verla YA desde el
  // propio email (sin esto el admin tendría que entrar a /admin/contacto
  // cada vez) — el bucket es privado, así que esta es la única forma de
  // enlazarla sin hacerla pública para cualquiera con el enlace para siempre.
  let photoHtml = "";
  if (photoPath) {
    const { data: signed } = await admin.storage
      .from(CONTACT_BUCKET)
      .createSignedUrl(photoPath, 60 * 60 * 24 * 30); // 30 días
    if (signed?.signedUrl) {
      photoHtml = `<p><img src="${signed.signedUrl}" alt="Foto adjunta" style="max-width:320px;border-radius:12px;" /></p>`;
    }
  }
  const categoryLabel = CONTACT_CATEGORIES.find((c) => c.value === category)?.label ?? category;

  // Los dos emails son "best effort": si Resend falla o no está
  // configurado, el mensaje YA se guardó arriba y se puede ver desde
  // /admin/contacto — nunca se le dice al usuario que algo falló por
  // esto, y nunca bloquea la respuesta de éxito del formulario.
  await Promise.all([
    // Al admin — con reply_to puesto al email del cliente, así
    // contestar es tan fácil como pulsar "Responder" en Gmail: la
    // respuesta le llega directamente a él, no a esta bandeja.
    sendEmail({
      to: NOTIFICATION_EMAIL,
      subject: `[${categoryLabel}] ${title} — ${name}`,
      replyTo: email,
      html: `
        <p><strong>${name}</strong> (${email}) ha escrito desde el formulario de contacto.</p>
        <p style="color:#8C9BAC;font-size:13px;">Categoría: ${categoryLabel}</p>
        <p><strong>${title}</strong></p>
        <p style="white-space:pre-line;border-left:3px solid #D8933B;padding-left:12px;">${message}</p>
        ${photoHtml}
        <p style="margin-top:16px;"><a href="mailto:${email}">Responder a ${email}</a></p>
      `,
    }),
    // Al cliente — confirma que ha llegado bien.
    sendEmail({
      to: email,
      subject: `Hemos recibido tu mensaje: "${title}" — Toca y Recuerda`,
      html: `
        <p>Hola ${name},</p>
        <p>Hemos recibido tu mensaje correctamente. Te responderemos lo antes posible a esta misma dirección.</p>
        <p style="color:#8C9BAC;font-size:13px;">${categoryLabel} — ${title}</p>
        <p style="white-space:pre-line;color:#8C9BAC;border-left:3px solid #E7E2DC;padding-left:12px;">${message}</p>
        <p>— Toca y Recuerda</p>
      `,
    }),
  ]);

  return { ok: true };
}
