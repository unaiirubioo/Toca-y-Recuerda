import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { LandingFooter } from "@/components/landing/footer";

export const metadata: Metadata = { title: "Blog" };

const ENTRIES = [
  {
    q: "¿Puedo poner el NFC en un marco de fotos que ya tengo, en vez de comprar un imán nuevo?",
    a: "Sí. El NFC es solo una pequeña pegatina — se puede pegar por detrás de un marco, dentro de un álbum de papel, en una libreta o en cualquier objeto plano. No hace falta que sea uno de nuestros imanes.",
  },
  {
    q: "Regalé un NFC a mis abuelos con la foto de su boda. ¿Necesitan instalar alguna app?",
    a: "No. Solo tienen que acercar el móvil a la etiqueta como si fuera un pago sin contacto — el navegador se abre solo y muestra el álbum. No hace falta cuenta, ni contraseña, ni instalar nada, salvo que hayas marcado ese álbum como privado.",
  },
  {
    q: "Tengo 200 fotos de un viaje de dos semanas. ¿Se puede organizar en varias partes?",
    a: "Sí — puedes añadir varios \"momentos\" (bloques de texto) dentro del mismo álbum para separar los días o las ciudades, y subir todas las fotos que quieras dentro de los límites de tu plan.",
  },
  {
    q: "¿Qué pasa si cambio de opinión sobre las fotos después de haber programado el NFC?",
    a: "El NFC nunca guarda tus fotos, solo un enlace. Puedes cambiar fotos, texto, portada o incluso el diseño del álbum las veces que quieras — el NFC seguirá abriendo siempre el mismo álbum, ya actualizado.",
  },
  {
    q: "Quiero regalar un álbum para una boda, pero que solo lo vean los invitados que yo decida.",
    a: "Marca el álbum como privado y ponle una contraseña al crearlo. Compártela solo con quien tú quieras — sin contraseña correcta, nadie más puede abrirlo, ni siquiera con el enlace.",
  },
  {
    q: "¿El NFC funciona en cualquier móvil?",
    a: "Funciona en la gran mayoría de Android e iPhone (iPhone 7 o más reciente, con iOS actualizado). En algunos modelos más antiguos puede no detectarse automáticamente; en ese caso, casi siempre existe una opción de \"Lector NFC\" en los ajustes del teléfono.",
  },
];

export default function BlogPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream-100 px-4 py-14">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-center font-display text-3xl font-semibold text-ink-900">
            Preguntas frecuentes
          </h1>
          <p className="mb-10 text-center text-ink-500">
            Casos reales de cómo la gente usa Toca y Recuerda.
          </p>

          <div className="space-y-4">
            {ENTRIES.map((entry) => (
              <div key={entry.q} className="rounded-2xl bg-white p-6 shadow-soft">
                <h2 className="font-display text-base font-semibold text-ink-900">{entry.q}</h2>
                <p className="mt-2 text-sm text-ink-700">{entry.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
