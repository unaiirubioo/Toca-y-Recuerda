import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { listContactMessages } from "@/lib/queries/admin-contact";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Contacto · Admin" };

export default async function AdminContactPage() {
  const messages = await listContactMessages();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900">Contacto</h1>
        <p className="text-sm text-ink-500">
          {messages.length} mensajes recibidos. Cada uno llega también por email a tu bandeja — para
          responder, basta con pulsar "Responder" en ese email o el botón de aquí abajo.
        </p>
      </div>

      {messages.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-ink-500 shadow-soft">
          Todavía no ha escrito nadie por el formulario de contacto.
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className="rounded-2xl bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{m.categoryLabel}</Badge>
                    {m.title && <p className="font-medium text-ink-900">{m.title}</p>}
                  </div>
                  <p className="text-sm text-ink-700">{m.name}</p>
                  <p className="text-xs text-ink-500">{m.email}</p>
                </div>
                <span className="text-xs text-ink-400">
                  {new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(m.createdAt)
                  )}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-ink-700">{m.message}</p>
              {m.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.photoUrl}
                  alt="Foto adjunta"
                  className="mt-3 h-40 w-40 rounded-xl object-cover"
                />
              )}
              <a
                href={`mailto:${m.email}?subject=${encodeURIComponent(
                  m.title ? `Re: ${m.title}` : "Re: tu mensaje a Toca y Recuerda"
                )}`}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:underline"
              >
                <Mail className="h-3.5 w-3.5" />
                Responder a {m.email}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
