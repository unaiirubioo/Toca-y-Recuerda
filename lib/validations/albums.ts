import { z } from "zod";

export const albumFormSchema = z.object({
  title: z.string().min(2, "Dale un nombre a este recuerdo.").max(80),
  eventDateStart: z.string().optional().nullable(),
  eventDateEnd: z.string().optional().nullable(),
  locationName: z.string().max(120).optional().nullable(),
  locationLat: z.number().optional().nullable(),
  locationLng: z.number().optional().nullable(),
  memory: z.string().max(4000).optional().nullable(),
  designTheme: z.enum(["classic", "moderno", "minimal"]).default("classic"),
  designFont: z.enum(["default", "serif", "manuscrita"]).default("default"),
  designLayout: z.enum(["grid", "revista", "linea-tiempo"]).default("grid"),
  musicUrl: z.string().url("Esa URL de música no parece válida.").optional().or(z.literal("")).nullable(),
  musicTitle: z.string().max(120).optional().nullable(),
  privacy: z.enum(["public", "private"]).default("private"),
  privacyPassword: z.string().max(60).optional().nullable(),
});

export type AlbumFormValues = z.infer<typeof albumFormSchema>;

export const albumStepFields = {
  nombre: ["title"] as const,
  fecha: ["eventDateStart", "eventDateEnd"] as const,
  ubicacion: ["locationName", "locationLat", "locationLng"] as const,
  historia: ["memory"] as const,
  estilo: ["designTheme", "designFont", "designLayout"] as const,
  musica: ["musicUrl", "musicTitle"] as const,
  privacidad: ["privacy", "privacyPassword"] as const,
};
