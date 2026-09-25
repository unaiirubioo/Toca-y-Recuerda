"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { invalidateCachedUserStatus } from "@/lib/security/user-status-cache";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("No autenticado.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if ((profile as any)?.role !== "admin") throw new Error("No autorizado.");
}

export async function setUserBlocked(userId: string, blocked: boolean): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("profiles").update({ is_blocked: blocked }).eq("id", userId);
  invalidateCachedUserStatus(userId);
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
}
