"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StepIndicator } from "@/components/albums/step-indicator";
import { LocationAutocomplete } from "@/components/albums/location-autocomplete";
import { MediaUploader } from "@/components/albums/media-uploader";
import { createAlbum, updateAlbum, updateAlbumMemories } from "@/lib/actions/albums";
import { finalizeAlbumWithAi } from "@/lib/actions/ai-design";
import type { AlbumFormValues } from "@/lib/validations/albums";

// El mapa usa window/document (Leaflet), así que se carga solo en el navegador.
const LocationPicker = dynamic(
  () => import("@/components/albums/location-picker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <div className="h-[260px] rounded-xl bg-ink-50" /> }
);

const THEMES = [
  { value: "classic", label: "Clásico", swatch: "bg-ink-700" },
  { value: "moderno", label: "Moderno", swatch: "bg-amber-500" },
  { value: "minimal", label: "Minimalista", swatch: "bg-ink-300" },
] as const;

const LAYOUTS = [
  { value: "grid", label: "Cuadrícula" },
  { value: "revista", label: "Revista" },
  { value: "linea-tiempo", label: "Línea de tiempo" },
] as const;

type FormState = AlbumFormValues;

const initialState: FormState = {
  title: "",
  eventDateStart: "",
  eventDateEnd: "",
  locationName: "",
  locationLat: null,
  locationLng: null,
  memory: "",
  designTheme: "classic",
  designFont: "default",
  designLayout: "grid",
  musicUrl: "",
  musicTitle: "",
  privacy: "private",
  privacyPassword: "",
};

// Se añadió el paso "Fotos y vídeos" (spec: subir dentro del propio
// asistente) y el cierre pasó de "Publicar álbum" a "Crear con IA",
// porque ahora la última pulsación dispara el diseño automático.
const STEP_TITLES = [
  "¿Cómo se llama este recuerdo?",
  "¿Cuándo ocurrió?",
  "¿Dónde fue?",
  "Cuéntanos el recuerdo",
  "Dale tu estilo",
  "¿Quieres añadir música?",
  "¿Quién puede verlo?",
  "Sube tus fotos y vídeos",
  "Revisión",
];

const PHOTOS_STEP = 7;

export function AlbumWizard({ nfcToken }: { nfcToken?: string | null }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [finalizing, setFinalizing] = useState(false);
  const router = useRouter();

  const totalSteps = STEP_TITLES.length;
  const isLast = step === totalSteps - 1;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function next() {
    setError(null);

    // Paso 0 → 1: aquí es donde de verdad se crea el álbum (spec: el
    // álbum se crea en cuanto tiene nombre, no al final del todo, para
    // que el paso de fotos ya tenga un álbum real al que subir).
    if (step === 0) {
      if (form.title.trim().length < 2) {
        setError("Dale un nombre a este recuerdo antes de continuar.");
        return;
      }
      if (albumId) {
        setStep(1);
        return;
      }
      startTransition(async () => {
        const result = await createAlbum({ ...form }, nfcToken);
        if ("error" in result && result.error) {
          setError(result.error);
          return;
        }
        if ("albumId" in result && result.albumId) {
          setAlbumId(result.albumId);
          setStep(1);
        }
      });
      return;
    }

    // Al llegar al paso de fotos, se guarda todo lo recopilado hasta
    // ahora — así, si alguien sube fotos y cierra la pestaña, el álbum
    // ya tiene sus datos aunque no llegue a pulsar "Crear con IA".
    if (step === PHOTOS_STEP - 1 && albumId) {
      startTransition(async () => {
        await updateAlbum(albumId, form);
        if (form.memory && form.memory.trim()) {
          await updateAlbumMemories(albumId, [form.memory]);
        }
        setStep((s) => Math.min(s + 1, totalSteps - 1));
      });
      return;
    }

    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  function handleFinish() {
    if (!albumId) return;
    setError(null);
    startTransition(async () => {
      await updateAlbum(albumId, form);
      setFinalizing(true);
      const result = await finalizeAlbumWithAi(albumId);
      if ("error" in result && result.error) {
        setFinalizing(false);
        setError(result.error);
        return;
      }
      router.push(`/albumes/${albumId}/editar?creando=1`);
    });
  }

  if (finalizing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-5 flex h-16 w-16 animate-pulse items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="mb-2 font-display text-xl font-semibold text-ink-900">
          Nuestra IA está diseñando tu álbum…
        </h1>
        <p className="text-sm text-ink-500">Esto tarda solo unos segundos.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <StepIndicator step={step} total={totalSteps} />
      <h1 className="mb-6 font-display text-2xl font-semibold text-ink-900">
        {STEP_TITLES[step]}
      </h1>

      <div className="min-h-[280px]">
        {step === 0 && (
          <div>
            <Label htmlFor="title">Nombre del recuerdo</Label>
            <Input
              id="title"
              placeholder="Mi viaje a Bilbao"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              autoFocus
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="start">Fecha de inicio</Label>
              <Input
                id="start"
                type="date"
                value={form.eventDateStart ?? ""}
                onChange={(e) => update("eventDateStart", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end">Fecha de fin (opcional)</Label>
              <Input
                id="end"
                type="date"
                value={form.eventDateEnd ?? ""}
                onChange={(e) => update("eventDateEnd", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="locationName">Lugar</Label>
              <LocationAutocomplete
                value={form.locationName ?? ""}
                onTextChange={(text) => update("locationName", text)}
                onSelect={(label, lat, lng) => {
                  update("locationName", label);
                  update("locationLat", lat);
                  update("locationLng", lng);
                }}
              />
              <p className="mt-1.5 text-xs text-ink-500">
                Escribe y elige una sugerencia — el mapa se coloca solo.
                También puedes tocar el mapa para ajustar el punto exacto.
              </p>
            </div>
            <LocationPicker
              lat={form.locationLat}
              lng={form.locationLng}
              onChange={(lat, lng) => {
                update("locationLat", lat);
                update("locationLng", lng);
              }}
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <Textarea
              placeholder="Escribe la historia de este recuerdo…"
              value={form.memory ?? ""}
              onChange={(e) => update("memory", e.target.value)}
            />
            <p className="mt-2 text-xs text-ink-500">
              Podrás añadir más momentos después, desde la edición del álbum.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div>
              <Label>Tema</Label>
              <div className="flex gap-3">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update("designTheme", t.value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs focus-ring ${
                      form.designTheme === t.value ? "border-amber-500" : "border-ink-100"
                    }`}
                  >
                    <span className={`h-8 w-8 rounded-full ${t.swatch}`} />
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-500">
                Es solo un punto de partida — nuestra IA lo afinará al final según tus fotos.
              </p>
            </div>
            <div>
              <Label>Distribución</Label>
              <div className="flex flex-wrap gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => update("designLayout", l.value)}
                    className={`rounded-full border px-4 py-2 text-sm focus-ring ${
                      form.designLayout === l.value
                        ? "border-amber-500 bg-amber-500/10 text-amber-600"
                        : "border-ink-100 text-ink-700"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              Añade el enlace de una canción que tengas derecho a usar (por ejemplo, un enlace directo a un archivo de audio). La biblioteca propia de música llegará más adelante.
            </p>
            <div>
              <Label htmlFor="musicTitle">Título de la canción (opcional)</Label>
              <Input
                id="musicTitle"
                value={form.musicTitle ?? ""}
                onChange={(e) => update("musicTitle", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="musicUrl">Enlace (opcional)</Label>
              <Input
                id="musicUrl"
                type="url"
                placeholder="https://…"
                value={form.musicUrl ?? ""}
                onChange={(e) => update("musicUrl", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => update("privacy", "public")}
                className={`flex-1 rounded-xl border p-4 text-left focus-ring ${
                  form.privacy === "public" ? "border-amber-500 bg-amber-500/10" : "border-ink-100"
                }`}
              >
                <div className="mb-1 text-lg">🔓</div>
                <div className="font-medium text-ink-900">Público</div>
                <div className="text-xs text-ink-500">Cualquiera con el enlace puede verlo.</div>
              </button>
              <button
                type="button"
                onClick={() => update("privacy", "private")}
                className={`flex-1 rounded-xl border p-4 text-left focus-ring ${
                  form.privacy === "private" ? "border-amber-500 bg-amber-500/10" : "border-ink-100"
                }`}
              >
                <div className="mb-1 text-lg">🔒</div>
                <div className="font-medium text-ink-900">Privado</div>
                <div className="text-xs text-ink-500">Solo con contraseña.</div>
              </button>
            </div>
            {form.privacy === "private" && (
              <div>
                <Label htmlFor="privacyPassword">Contraseña de acceso</Label>
                <Input
                  id="privacyPassword"
                  type="password"
                  autoComplete="new-password"
                  value={form.privacyPassword ?? ""}
                  onChange={(e) => update("privacyPassword", e.target.value)}
                />
                <p className="mt-1 text-xs text-ink-500">
                  Quien tenga el enlace o el NFC necesitará esta contraseña para ver el álbum. Podrás cambiarla más adelante desde la edición.
                </p>
              </div>
            )}
          </div>
        )}

        {step === PHOTOS_STEP && (
          <div className="space-y-3">
            {albumId ? (
              <MediaUploader albumId={albumId} />
            ) : (
              <p className="text-sm text-danger">
                Todavía no se ha creado el álbum — vuelve al primer paso e inténtalo de nuevo.
              </p>
            )}
            <p className="text-xs text-ink-500">
              Puedes añadir más fotos y vídeos después, desde la edición del álbum.
            </p>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-3 rounded-xl border border-ink-100 bg-cream-100 p-5">
            <p>
              <span className="font-medium">Nombre:</span> {form.title || "—"}
            </p>
            <p>
              <span className="font-medium">Fecha:</span> {form.eventDateStart || "Sin especificar"}
            </p>
            <p>
              <span className="font-medium">Lugar:</span> {form.locationName || "Sin especificar"}
            </p>
            <p>
              <span className="font-medium">Privacidad:</span>{" "}
              {form.privacy === "public" ? "Público" : "Privado"}
            </p>
            <p className="flex items-center gap-1.5 pt-2 text-amber-600">
              <Sparkles className="h-4 w-4" /> Al pulsar "Crear con IA", elegimos el estilo
              final y escribimos una frase de presentación para tu álbum.
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={back} disabled={step === 0 || pending}>
          <ChevronLeft className="h-4 w-4" /> Atrás
        </Button>
        {isLast ? (
          <Button onClick={handleFinish} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Crear con IA
          </Button>
        ) : (
          <Button onClick={next} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Continuar <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
