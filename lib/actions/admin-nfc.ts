"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateNfcToken, buildNfcUrl } from "@/lib/nfc";
import { requireAdmin } from "@/lib/security/require-admin";

/**
 * Crea un NFC nuevo en estado STOCK (spec #61). El cliente NUNCA programa
 * el NFC: un administrador copia la URL generada aquí y la grava
 * físicamente con una herramienta como NFC Tools (spec #62).
 *
 * Reintenta ante una colisión de token astronómicamente improbable
 * pero posible (restricción UNIQUE en la base de datos).
 */
export async function generateNfcTag(): Promise<{ token: string; url: string } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 3; attempt++) {
    const token = generateNfcToken();
    const { error } = await admin.from("nfc_tags").insert({ public_token: token, status: "stock" });
    if (!error) {
      revalidatePath("/admin/nfc");
      return { token, url: buildNfcUrl(token) };
    }
    if (error.code !== "23505") {
      return { error: "No hemos podido generar el NFC. Inténtalo otra vez." };
    }
    // 23505 = colisión de token: se reintenta con uno nuevo.
  }

  return { error: "No hemos podido generar un token único. Inténtalo otra vez." };
}

export async function generateNfcBatch(quantity: number): Promise<{ error: string } | { count: number }> {
  await requireAdmin();
  const admin = createAdminClient();

  const rows = Array.from({ length: Math.min(Math.max(quantity, 1), 100) }, () => ({
    public_token: generateNfcToken(),
    status: "stock" as const,
  }));

  const { error } = await admin.from("nfc_tags").insert(rows);
  if (error) return { error: "No hemos podido generar el lote de NFC." };

  revalidatePath("/admin/nfc");
  return { count: rows.length };
}

/**
 * Cambia el estado de un NFC. Usa el cliente admin: `status` tiene el
 * privilegio de columna revocado para el rol "authenticated" (migración
 * 0005) — y un usuario admin de la plataforma sigue siendo, a nivel de
 * Postgres, el rol "authenticated" (el rol admin es un valor de
 * negocio en `profiles`, no un rol de base de datos distinto).
 */
export async function setNfcStatus(
  nfcId: string,
  status: "stock" | "reserved" | "sold" | "assigned" | "active" | "disabled"
): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("nfc_tags").update({ status }).eq("id", nfcId);
  revalidatePath("/admin/nfc");
}

/**
 * Elimina por completo un NFC del inventario (spec: botón "eliminar"
 * en /admin/nfc). Solo tiene sentido para uno que todavía no está
 * vinculado a un álbum en uso real — si lo está, primero hay que
 * desvincularlo (se avisa en el propio panel).
 */
export async function deleteNfcTag(nfcId: string): Promise<{ error: string } | { ok: true }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("nfc_tags").delete().eq("id", nfcId);
  if (error) return { error: "No hemos podido eliminar ese NFC." };

  revalidatePath("/admin/nfc");
  return { ok: true };
}
