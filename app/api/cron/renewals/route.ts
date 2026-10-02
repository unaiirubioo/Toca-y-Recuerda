import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STORAGE_BUCKET } from "@/lib/storage";
import { sendEmail } from "@/lib/email/resend";
import { isWithinReminderWindow, isPastGracePeriod } from "@/lib/business/renewal";

export const dynamic = "force-dynamic";

/**
 * Job programado (spec #10): pensado para que lo llame un Vercel Cron
 * una vez al día (ver vercel.json). Hace dos cosas:
 *  1. A los álbumes a los que les queden 30 días o menos para renovar,
 *     les manda UN aviso por email (y no más, gracias a
 *     renewal_reminder_sent_at) explicando que hay que pagar.
 *  2. A los álbumes que llevan más de 30 días vencidos sin pagar, los
 *     borra de verdad: archivos del storage y la fila de la base de
 *     datos.
 *
 * Protegido con un secreto compartido (CRON_SECRET) para que nadie más
 * pueda disparar el borrado llamando a la URL directamente.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  const { data: albums, error } = await admin
    .from("albums")
    .select("id, title, owner_id, public_slug, renewal_due_at, renewal_reminder_sent_at")
    .eq("status", "published")
    .not("renewal_due_at", "is", null);

  if (error) {
    console.error("cron/renewals:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let remindersSent = 0;
  let deleted = 0;

  for (const row of (albums as any[]) ?? []) {
    const dueAt = new Date(row.renewal_due_at);

    if (isPastGracePeriod(dueAt, now)) {
      // 1) Vacía la carpeta de archivos del álbum en el storage.
      const { data: files } = await admin.storage.from(STORAGE_BUCKET).list(row.id);
      if (files && files.length > 0) {
        await admin.storage.from(STORAGE_BUCKET).remove(files.map((f) => `${row.id}/${f.name}`));
      }
      // 2) Borra el álbum (sus filas hijas caen en cascada, ver 0001_init.sql).
      await admin.from("albums").delete().eq("id", row.id);
      deleted += 1;
      continue;
    }

    if (isWithinReminderWindow(dueAt, now) && !row.renewal_reminder_sent_at) {
      const { data: authUser } = await admin.auth.admin.getUserById(row.owner_id);
      const email = authUser.user?.email;
      if (email) {
        const sent = await sendEmail({
          to: email,
          subject: `Tu álbum "${row.title}" necesita renovarse`,
          html: `
            <p>Hola,</p>
            <p>El plazo de conservación de 5 años de tu álbum <strong>${row.title}</strong> está a punto de terminar.</p>
            <p>Si no lo renuevas antes del ${dueAt.toLocaleDateString("es-ES")}, tendrás 30 días de margen
               y después se eliminará de forma permanente, con sus fotos y vídeos.</p>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/album/renovar/${row.id}">Renovarlo ahora</a></p>
            <p>— Toca y Recuerda</p>
          `,
        });
        if (sent) {
          await admin.from("albums").update({ renewal_reminder_sent_at: now.toISOString() }).eq("id", row.id);
          remindersSent += 1;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, remindersSent, deleted });
}
