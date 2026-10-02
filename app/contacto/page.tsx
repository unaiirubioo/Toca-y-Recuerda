import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { LandingFooter } from "@/components/landing/footer";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contacto" };

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream-100 px-4 py-14">
        <div className="mx-auto max-w-md">
          <h1 className="mb-2 text-center font-display text-3xl font-semibold text-ink-900">Contacto</h1>
          <p className="mb-8 text-center text-ink-500">¿Dudas, problemas o sugerencias? Escríbenos.</p>
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <ContactForm />
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
