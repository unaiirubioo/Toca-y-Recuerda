import Image from "next/image";
import { Camera, Package, Smartphone } from "lucide-react";

const STEPS = [
  {
    icon: Package,
    title: "1. Pega la etiqueta NFC",
    description: "Convierte cualquier imán o recuerdo en algo inteligente.",
  },
  {
    icon: Camera,
    title: "2. Acerca tu móvil",
    description: "La tecnología NFC hace el resto — sin apps ni configuración.",
  },
  {
    icon: Smartphone,
    title: "3. Disfruta tus recuerdos",
    description: "Fotos, vídeos y momentos, siempre contigo.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-white px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          Cómo funciona
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-ink-500">
          Tan sencillo que se explica en tres pasos.
        </p>

        <div className="mt-10 overflow-hidden rounded-3xl shadow-card">
          <Image
            src="/landing/pasossimples.jpg"
            alt="Paso 1: pega la etiqueta NFC. Paso 2: acerca tu móvil. Paso 3: disfruta tus recuerdos."
            width={1600}
            height={950}
            className="w-full"
          />
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex flex-col items-center rounded-2xl border border-ink-100 p-6 text-center transition hover:-translate-y-1 hover:shadow-card"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
                <step.icon className="h-7 w-7" />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-900">{step.title}</h3>
              <p className="mt-1 text-sm text-ink-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
