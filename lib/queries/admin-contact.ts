import { requireAdmin } from "@/lib/security/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACT_BUCKET, CONTACT_CATEGORIES } from "@/lib/contact-constants";

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  title: string | null;
  category: string;
  categoryLabel: string;
  message: string;
  photoUrl: string | null;
  createdAt: string;
};

/** Mensajes del formulario de contacto, más recientes primero (spec: verlos desde /admin). */
export async function listContactMessages(): Promise<ContactMessageRow[]> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("contact_messages")
    .select("id, name, email, title, category, message, photo_path, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("listContactMessages:", error.message);
    return [];
  }

  const rows = (data as any[]) ?? [];

  // Las fotos viven en un bucket privado (spec: solo el admin puede
  // verlas) — hay que generar una URL firmada por cada una para poder
  // mostrarlas en el panel.
  const photoPaths = rows.filter((r) => r.photo_path).map((r) => r.photo_path as string);
  const signedByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await admin.storage
      .from(CONTACT_BUCKET)
      .createSignedUrls(photoPaths, 60 * 60); // 1 hora, de sobra para ver el panel
    for (const s of (signed as any[]) ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
    }
  }

  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    title: m.title,
    category: m.category,
    categoryLabel: CONTACT_CATEGORIES.find((c) => c.value === m.category)?.label ?? m.category,
    message: m.message,
    photoUrl: m.photo_path ? (signedByPath.get(m.photo_path) ?? null) : null,
    createdAt: m.created_at,
  }));
}
