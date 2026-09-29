import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { LandingFooter } from "@/components/landing/footer";
import { FaqAccordion } from "@/components/faq/faq-accordion";

export const metadata: Metadata = { title: "Preguntas y respuestas" };

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
    a: 'Sí — puedes añadir varios "momentos" (bloques de texto) dentro del mismo álbum para separar los días o las ciudades, y subir todas las fotos que quieras dentro de los límites de tu plan.',
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
    a: 'Funciona en la gran mayoría de Android e iPhone (iPhone 7 o más reciente, con iOS actualizado). En algunos modelos más antiguos puede no detectarse automáticamente; en ese caso, casi siempre existe una opción de "Lector NFC" en los ajustes del teléfono.',
  },
  {
    q: "¿Puedo usar una etiqueta NFC que ya tengo yo, en vez de comprar la vuestra?",
    a: 'Sí. Si solo compras el álbum (sin NFC físico), puedes generar tú mismo el código desde Ajustes de tu cuenta y grabarlo en cualquier pegatina NFC en blanco con una app gratuita como "NFC Tools". Tienes derecho a un código gratis siempre, y a uno más por cada álbum adicional que compres sin NFC incluido. Si compras el pack con NFC físico incluido, te lo enviamos ya listo y no hace falta que generes ninguno.',
  },
  {
    q: "Ya tengo cuenta, ¿puedo asociar un NFC a un álbum que hice hace tiempo?",
    a: 'Sí, en cualquier momento. Entra en el álbum, ve a "Editar" y podrás vincular un NFC nuevo o uno que ya tengas generado, sin tener que volver a crear el álbum desde cero.',
  },
  {
    q: "¿Cuántos álbumes puedo crear gratis?",
    a: "Tienes un álbum gratuito de por vida, con un límite de fotos más reducido que el plan Premium. A partir del segundo álbum, o si quieres más fotos y vídeos en el primero, puedes comprar Premium por álbum o alguno de los packs.",
  },
  {
    q: "He subido fotos pero no le he dado a publicar. ¿Se pierde el trabajo?",
    a: "No, tu álbum se queda guardado como borrador tal cual lo dejaste. Puedes volver cuando quieras desde tu panel y retomarlo exactamente donde lo dejaste, antes de publicarlo definitivamente.",
  },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream-100 px-4 py-14">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-center font-display text-3xl font-semibold text-ink-900">
            Preguntas y respuestas
          </h1>
          <p className="mb-10 text-center text-ink-500">
            Casos reales de cómo la gente usa Toca y Recuerda. Toca una pregunta para ver la respuesta.
          </p>

          <FaqAccordion entries={ENTRIES} />
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
