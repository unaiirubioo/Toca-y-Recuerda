import Stripe from "stripe";

let stripe: Stripe | null = null;

/** Instancia única de Stripe, creada al vuelo para no romper el build si falta la clave en tiempo de compilación. */
export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Falta STRIPE_SECRET_KEY en las variables de entorno.");
    stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  }
  return stripe;
}
