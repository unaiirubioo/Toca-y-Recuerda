import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function Hero() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const ctaHref = data.user ? "/albumes/nuevo" : "/registro";

  return (
    <section className="overflow-hidden px-4 pb-16 pt-12 sm:pt-20">
      <div className="mx-auto max-w-3xl text-center">
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-4 py-1.5 text-sm font-semibold text-success">
          🎁 Tu primer álbum es gratis, para siempre
        </span>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink-900 sm:text-5xl">
          Convierte tus recuerdos en algo que puedas tocar.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-500">
          Guarda tus viajes, fotos y momentos especiales en un álbum digital
          y accede a ellos acercando tu móvil a tu recuerdo.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={ctaHref} className={cn(buttonVariants({ size: "lg" }))}>
            Crear mi recuerdo
          </Link>
          <a href="#como-funciona" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Ver cómo funciona
          </a>
        </div>
      </div>

      {/* Fotos reales del producto: el imán con NFC en la nevera, y el álbum abriéndose en el móvil */}
      <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-3xl shadow-card">
          <Image
            src="/landing/inicio1.jpg"
            alt="Imanes de recuerdos con NFC en la nevera, abriendo el álbum en el móvil"
            width={800}
            height={800}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <div className="overflow-hidden rounded-3xl shadow-card">
          <Image
            src="/landing/inicio2.jpg"
            alt="Acercando el móvil a un imán NFC para revivir un viaje a España"
            width={800}
            height={800}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
