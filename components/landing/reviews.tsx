import { Star } from "lucide-react";

// Reseñas ilustrativas (no de clientes reales) para mostrar el tono y
// el tipo de experiencia — sustitúyelas por reseñas reales en cuanto
// tengas las primeras, spec: nunca dejar contenido de marketing que
// se pueda confundir con datos reales sin que tú lo sepas.
const REVIEWS = [
  {
    name: "Marta G.",
    text: "Le regalé a mis padres un imán con nuestro viaje a Roma. Cuando acercaron el móvil se les saltaron las lágrimas — no se lo esperaban para nada.",
  },
  {
    name: "Javier R.",
    text: "Lo uso para la foto de boda de mis abuelos. Ahora, cada vez que alguien la mira en el salón, puede tocarla y ver el vídeo de la ceremonia entera.",
  },
  {
    name: "Lucía M.",
    text: "Pensé que sería complicado de configurar y fue al revés: creé el álbum en diez minutos y mi NFC llegó a los tres días. Perfecto para regalar.",
  },
];

export function Reviews() {
  return (
    <section className="bg-cream-100 px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          Lo que dicen quienes ya lo usan
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {REVIEWS.map((r) => (
            <div key={r.name} className="rounded-2xl bg-white p-6 shadow-soft">
              <div className="mb-3 flex gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="text-sm text-ink-700">"{r.text}"</p>
              <p className="mt-4 text-sm font-medium text-ink-900">{r.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
