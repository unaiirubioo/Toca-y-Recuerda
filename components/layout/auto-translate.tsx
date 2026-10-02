"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: { translate?: { TranslateElement: new (options: object, el: string) => void } };
    googleTranslateElementInit?: () => void;
  }
}

/**
 * Traducción automática según el idioma del navegador (spec #20),
 * gratis, sin clave de API: usa el widget público de Google Website
 * Translator. No hace falta backend ni servicio de geolocalización —
 * `navigator.language` ya nos dice el idioma preferido del visitante.
 *
 * Solo se activa si el idioma del navegador NO es español, y solo la
 * primera vez (se recuerda con una cookie para no traducir de nuevo si
 * el usuario vuelve a poner la página en español a propósito).
 */
export function AutoTranslate() {
  const [showWidget, setShowWidget] = useState(false);

  useEffect(() => {
    const browserLang = (navigator.language || "es").slice(0, 2).toLowerCase();
    const dismissed = document.cookie.includes("translate_dismissed=1");
    const alreadySet = document.cookie.includes("googtrans=");

    if (browserLang === "es" || dismissed || alreadySet) return;

    // Carga el script del widget y auto-selecciona el idioma del
    // visitante vía la cookie `googtrans` que usa Google Translate.
    document.cookie = `googtrans=/es/${browserLang}; path=/; max-age=${60 * 60 * 24 * 365}`;

    window.googleTranslateElementInit = () => {
      if (window.google?.translate) {
        new window.google.translate.TranslateElement(
          { pageLanguage: "es", autoDisplay: false },
          "google_translate_element"
        );
      }
    };

    const script = document.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
    setShowWidget(true);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  function dismiss() {
    document.cookie = "translate_dismissed=1; path=/; max-age=" + 60 * 60 * 24 * 365;
    document.cookie = "googtrans=; path=/; max-age=0";
    window.location.reload();
  }

  if (!showWidget) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-card">
      <div id="google_translate_element" className="text-xs" />
      <button
        type="button"
        onClick={dismiss}
        aria-label="Seguir en español"
        className="text-xs text-ink-500 hover:text-ink-900"
      >
        ✕
      </button>
    </div>
  );
}
