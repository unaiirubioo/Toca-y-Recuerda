"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, GripVertical, Loader2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateAiStory, type AiStory, type AiStorySection } from "@/lib/actions/ai-design";
import type { AlbumMediaItem } from "@/lib/queries/media";
import { cn } from "@/lib/utils";

/**
 * Vista previa interactiva de la historia que generó la IA (spec #4 y
 * #9): "que sea super interactivo" — mover una foto de sitio, mover un
 * momento entero arriba/abajo, y escribir tú mismo los títulos y las
 * notas de cada momento en vez de dejarlos automáticos. Vive al final
 * de la edición del álbum, donde el usuario ya ve todo junto.
 */
export function StoryEditor({
  albumId,
  initialStory,
  media,
}: {
  albumId: string;
  initialStory: AiStory;
  media: AlbumMediaItem[];
}) {
  const [story, setStory] = useState<AiStory>(initialStory);
  const [dragging, setDragging] = useState<{ sectionIndex: number; mediaId: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaById = new Map(media.map((m) => [m.id, m]));

  function updateSection(index: number, patch: Partial<AiStorySection>) {
    setSaved(false);
    setStory((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= story.sections.length) return;
    setSaved(false);
    setStory((prev) => {
      const next = [...prev.sections];
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return { ...prev, sections: next };
    });
  }

  function toggleHighlight(sectionIndex: number, mediaId: string) {
    setSaved(false);
    setStory((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => {
        if (i !== sectionIndex) return s;
        const isHighlighted = s.highlightMediaIds.includes(mediaId);
        return {
          ...s,
          highlightMediaIds: isHighlighted
            ? s.highlightMediaIds.filter((id) => id !== mediaId)
            : [...s.highlightMediaIds, mediaId],
        };
      }),
    }));
  }

  /** Mueve una foto a otra posición, incluso a otro momento distinto. */
  function movePhoto(targetSectionIndex: number, targetMediaId: string | null) {
    if (!dragging) return;
    const { sectionIndex: fromSection, mediaId } = dragging;
    setDragging(null);
    if (fromSection === targetSectionIndex && targetMediaId === mediaId) return;

    setSaved(false);
    setStory((prev) => {
      const sections = prev.sections.map((s) => ({ ...s, mediaIds: [...s.mediaIds], highlightMediaIds: [...s.highlightMediaIds] }));
      const source = sections[fromSection];
      if (!source) return prev;
      const wasHighlighted = source.highlightMediaIds.includes(mediaId);
      source.mediaIds = source.mediaIds.filter((id) => id !== mediaId);
      source.highlightMediaIds = source.highlightMediaIds.filter((id) => id !== mediaId);

      const target = sections[targetSectionIndex];
      if (!target) return prev;
      const insertAt = targetMediaId ? target.mediaIds.indexOf(targetMediaId) : target.mediaIds.length;
      target.mediaIds.splice(insertAt < 0 ? target.mediaIds.length : insertAt, 0, mediaId);
      if (wasHighlighted) target.highlightMediaIds.push(mediaId);

      return { ...prev, sections };
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateAiStory(albumId, story);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-500">Introducción</label>
        <Textarea
          value={story.intro}
          onChange={(e) => {
            setSaved(false);
            setStory((prev) => ({ ...prev, intro: e.target.value }));
          }}
          rows={2}
        />
      </div>

      {story.sections.map((section, index) => (
        <div key={index} className="rounded-xl border border-ink-100 p-4">
          <div className="mb-3 flex items-start gap-2">
            <div className="flex flex-col">
              <IconBtn onClick={() => moveSection(index, -1)} disabled={index === 0} label="Mover momento arriba">
                <ChevronUp className="h-4 w-4" />
              </IconBtn>
              <IconBtn
                onClick={() => moveSection(index, 1)}
                disabled={index === story.sections.length - 1}
                label="Mover momento abajo"
              >
                <ChevronDown className="h-4 w-4" />
              </IconBtn>
            </div>
            <div className="flex-1 space-y-2">
              <Input
                value={section.title}
                onChange={(e) => updateSection(index, { title: e.target.value })}
                placeholder={`Momento ${index + 1}`}
                className="font-display font-semibold"
              />
              <Textarea
                value={section.description}
                onChange={(e) => updateSection(index, { description: e.target.value })}
                placeholder="Nota de este momento (opcional)"
                rows={2}
              />
            </div>
          </div>

          <p className="mb-2 text-xs text-ink-500">
            Arrastra una foto para cambiarla de orden o de momento. La estrella la marca como destacada.
          </p>
          <div
            className="grid grid-cols-4 gap-2 rounded-lg bg-cream-100 p-2 sm:grid-cols-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              movePhoto(index, null);
            }}
          >
            {section.mediaIds.map((mediaId) => {
              const item = mediaById.get(mediaId);
              if (!item) return null;
              const isHighlighted = section.highlightMediaIds.includes(mediaId);
              return (
                <div
                  key={mediaId}
                  draggable
                  onDragStart={() => setDragging({ sectionIndex: index, mediaId })}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    movePhoto(index, mediaId);
                  }}
                  className={cn(
                    "group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-white active:cursor-grabbing",
                    isHighlighted ? "border-amber-500 ring-1 ring-amber-500" : "border-ink-100"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-start justify-between bg-black/0 p-1 opacity-0 transition group-hover:bg-black/20 group-hover:opacity-100">
                    <GripVertical className="h-3.5 w-3.5 text-white drop-shadow" />
                    <button
                      type="button"
                      onClick={() => toggleHighlight(index, mediaId)}
                      className="rounded-full bg-white/90 p-0.5"
                      aria-label="Marcar como destacada"
                    >
                      <Star className={cn("h-3 w-3 text-ink-900", isHighlighted && "fill-amber-500 text-amber-500")} />
                    </button>
                  </div>
                </div>
              );
            })}
            {section.mediaIds.length === 0 && (
              <p className="col-span-full py-3 text-center text-xs text-ink-400">
                Suelta aquí una foto de otro momento.
              </p>
            )}
          </div>
        </div>
      ))}

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-500">Cierre</label>
        <Textarea
          value={story.closing}
          onChange={(e) => {
            setSaved(false);
            setStory((prev) => ({ ...prev, closing: e.target.value }));
          }}
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending} size="sm">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cambios
        </Button>
        {saved && !pending && <span className="text-sm text-success">Guardado.</span>}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded-md p-1 text-ink-500 hover:bg-ink-50 hover:text-ink-900 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
