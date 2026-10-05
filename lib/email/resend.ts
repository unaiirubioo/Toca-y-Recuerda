/**
 * Envío de email transaccional vía Resend (plan gratuito: 3.000
 * emails/mes, de sobra para avisos de renovación). Implementado con
 * `fetch` directo a su API REST — no añade ninguna dependencia nueva
 * al proyecto.
 *
 * Necesita la variable de entorno RESEND_API_KEY (gratis en
 * resend.com). Sin ella, esta función no envía nada y lo deja escrito
 * en los logs — así el resto de la app (recordatorios, borrado) sigue
 * funcionando igual aunque el email aún no esté configurado.
 */
export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  /** Si lo rellenas, al admin le basta con pulsar "Responder" en su email para escribirle directo a esta dirección. */
  replyTo?: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  // OJO: `||` y no `??` — si la variable existe pero está vacía (fácil
  // de dejar así sin querer en Vercel), `??` no la sustituiría y Resend
  // rechazaría el envío con un remitente en blanco.
  const from = process.env.RESEND_FROM_EMAIL || "Toca y Recuerda <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("sendEmail: falta RESEND_API_KEY — no se envía email a", input.to, "asunto:", input.subject);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("sendEmail: Resend respondió", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("sendEmail:", err);
    return false;
  }
}
