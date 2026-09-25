import Image from "next/image";

const MOMENTS = [
  { src: "/landing/momento1.jpg", alt: "Pareja revisando su álbum de un viaje a los Alpes" },
  { src: "/landing/momento2.jpg", alt: "Pareja mayor celebrando 40 años juntos con su álbum de recuerdos" },
  { src: "/landing/momento3.jpg", alt: "Niña y su gato con un álbum de recuerdos familiares" },
  { src: "/landing/momento4.jpg", alt: "Pareja disfrutando de un verano en el Mediterráneo" },
  { src: "/landing/momento5.jpg", alt: "Grupo de amigos celebrando su graduación" },
  { src: "/landing/momento6.jpg", alt: "Amigo disfrutando de una noche de festival" },
];

export function Momentos() {
  return (
    <section id="momentos" className="bg-white px-4 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-display text-2xl font-semibold text-ink-900 sm:text-3xl">
          Momentos que merecen recordarse
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-ink-500">
          Viajes, bodas, mascotas, amigos, fiestas — cada recuerdo tiene su
          propio álbum, siempre a un toque de distancia.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MOMENTS.map((m) => (
            <div
              key={m.src}
              className="aspect-square overflow-hidden rounded-2xl transition hover:-translate-y-1 hover:shadow-card"
            >
              <Image
                src={m.src}
                alt={m.alt}
                width={600}
                height={600}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
