import Image from "next/image";

const STEPS = [
  "Pega o incrusta el NFC en tu marco, imán o recuerdo favorito.",
  "Crea tu álbum: sube fotos, vídeos y escribe la historia.",
  "Acerca el móvil cuando quieras revivirlo — sin buscar carpetas ni apps.",
];

export function ComoSeUsa() {
  return (
    <section className="bg-cream-100 px-4 py-16">
      <div className="mx-auto grid max-w-5xl items-center gap-10 sm:grid-cols-2">
        <div className="overflow-hidden rounded-3xl shadow-card">
          <Image
            src="/landing/comoseusa.jpg"
            alt="Marco de fotos con una pegatina NFC que dice 'Toca para revivir', junto al móvil mostrando el álbum"
            width={1200}
            height={1200}
            className="w-full"
          />
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
            Cómo se usa
          </h2>
          <p className="mt-2 text-ink-500">
            No hace falta ser experto en tecnología — si sabes acercar el
            móvil a algo, ya sabes usar Toca y Recuerda.
          </p>
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-ink-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
