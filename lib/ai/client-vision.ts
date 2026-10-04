/**
 * Análisis de fotos y vídeos 100% en el navegador de quien los sube.
 *
 * Por qué así: coste 0€ y sin límite diario de ningún tercero (spec).
 * Nada de esto llama a ninguna API externa de pago ni con cuota — el
 * único recurso de red es cargar la LIBRERÍA de TensorFlow.js/MobileNet
 * desde un CDN público (como ya hacíamos con el widget de Google
 * Translate), que es solo descargar código, no una llamada con límite
 * de uso. El cálculo en sí (EXIF, hash, desenfoque, clasificación)
 * corre enteramente en la CPU/GPU del propio visitante, tantas veces
 * como haga falta, sin límite impuesto por nadie.
 *
 * Si algo de esto falla (sin conexión, CDN bloqueado, navegador viejo),
 * cada función devuelve un resultado "vacío" en vez de lanzar un error
 * — el álbum siempre se puede crear igualmente, solo que sin ese dato.
 */

export type ClientMediaAnalysis = {
  takenAt: string | null; // ISO
  lat: number | null;
  lng: number | null;
  phash: string | null;
  blurScore: number | null;
  tags: string[];
};

const EMPTY: ClientMediaAnalysis = { takenAt: null, lat: null, lng: null, phash: null, blurScore: null, tags: [] };

/** Analiza una foto: EXIF + hash perceptual + desenfoque + etiquetas. */
export async function analyzeImageFile(file: File): Promise<ClientMediaAnalysis> {
  try {
    const [exif, bitmap] = await Promise.all([readExif(file), loadBitmap(file)]);
    if (!bitmap) return { ...EMPTY, ...exif };

    const { phash, blurScore } = analyzeBitmap(bitmap);
    const tags = await classifyBitmap(bitmap);
    bitmap.close?.();

    return { ...exif, phash, blurScore, tags };
  } catch {
    return EMPTY;
  }
}

/** Analiza un vídeo extrayendo un fotograma representativo (al 40% de su duración) y tratándolo como una foto. */
export async function analyzeVideoFile(file: File): Promise<ClientMediaAnalysis> {
  try {
    const bitmap = await extractVideoFrame(file, 0.4);
    if (!bitmap) return { ...EMPTY, takenAt: new Date(file.lastModified).toISOString() };

    const { phash, blurScore } = analyzeBitmap(bitmap);
    const tags = await classifyBitmap(bitmap);
    bitmap.close?.();

    return { takenAt: new Date(file.lastModified).toISOString(), lat: null, lng: null, phash, blurScore, tags };
  } catch {
    return { ...EMPTY, takenAt: new Date(file.lastModified).toISOString() };
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(file);
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------
// EXIF: fecha de la foto y GPS, leídos a mano del propio archivo JPEG
// (sin librerías: así no dependemos de que una dependencia nueva se
// instale bien, y el único dato que necesitamos son dos etiquetas).
// -----------------------------------------------------------------
async function readExif(file: File): Promise<{ takenAt: string | null; lat: number | null; lng: number | null }> {
  const fallback = { takenAt: new Date(file.lastModified).toISOString(), lat: null, lng: null };
  if (file.type !== "image/jpeg" && file.type !== "image/jpg") return fallback;

  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer(); // el EXIF siempre está al principio
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xffd8) return fallback; // no es un JPEG válido

    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xffe1) {
        const exifStart = offset + 4;
        if (view.getUint32(exifStart) !== 0x45786966) break; // "Exif"
        const tiffStart = exifStart + 6;
        const little = view.getUint16(tiffStart) === 0x4949;
        const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, little);
        const parsed = parseIfd(view, tiffStart, ifd0Offset, little);
        return {
          takenAt: parsed.takenAt ?? fallback.takenAt,
          lat: parsed.lat,
          lng: parsed.lng,
        };
      }
      if ((marker & 0xff00) !== 0xff00) break;
      offset += 2 + view.getUint16(offset + 2);
    }
  } catch {
    // archivo corrupto o formato inesperado: nos quedamos con la fecha de subida
  }
  return fallback;
}

function parseIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  little: boolean
): { takenAt: string | null; lat: number | null; lng: number | null } {
  let takenAt: string | null = null;
  let gpsIfdOffset: number | null = null;
  let exifIfdOffset: number | null = null;

  const entries = view.getUint16(ifdOffset, little);
  for (let i = 0; i < entries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, little);
    if (tag === 0x8825) gpsIfdOffset = tiffStart + view.getUint32(entryOffset + 8, little);
    if (tag === 0x8769) exifIfdOffset = tiffStart + view.getUint32(entryOffset + 8, little);
  }

  if (exifIfdOffset) {
    const subEntries = view.getUint16(exifIfdOffset, little);
    for (let i = 0; i < subEntries; i++) {
      const entryOffset = exifIfdOffset + 2 + i * 12;
      const tag = view.getUint16(entryOffset, little);
      if (tag === 0x9003 || tag === 0x0132) {
        // DateTimeOriginal o DateTime: 20 bytes ASCII "YYYY:MM:DD HH:MM:SS\0"
        const strOffset = tiffStart + view.getUint32(entryOffset + 8, little);
        const str = readAscii(view, strOffset, 19);
        const iso = exifDateToIso(str);
        if (iso) takenAt = iso;
      }
    }
  }

  let lat: number | null = null;
  let lng: number | null = null;
  if (gpsIfdOffset) {
    const gps = readGps(view, tiffStart, gpsIfdOffset, little);
    lat = gps.lat;
    lng = gps.lng;
  }

  return { takenAt, lat, lng };
}

function readAscii(view: DataView, offset: number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
}

function exifDateToIso(str: string): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(str);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function readGps(
  view: DataView,
  tiffStart: number,
  gpsIfdOffset: number,
  little: boolean
): { lat: number | null; lng: number | null } {
  let latRef = "N";
  let lngRef = "E";
  let lat: number | null = null;
  let lng: number | null = null;

  const entries = view.getUint16(gpsIfdOffset, little);
  for (let i = 0; i < entries; i++) {
    const entryOffset = gpsIfdOffset + 2 + i * 12;
    const tag = view.getUint16(entryOffset, little);
    if (tag === 0x0001) latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
    if (tag === 0x0003) lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
    if (tag === 0x0002) lat = readRational3(view, tiffStart, entryOffset, little);
    if (tag === 0x0004) lng = readRational3(view, tiffStart, entryOffset, little);
  }

  if (lat !== null && latRef === "S") lat = -lat;
  if (lng !== null && lngRef === "W") lng = -lng;
  return { lat, lng };
}

function readRational3(view: DataView, tiffStart: number, entryOffset: number, little: boolean): number | null {
  try {
    const valueOffset = tiffStart + view.getUint32(entryOffset + 8, little);
    const deg = view.getUint32(valueOffset, little) / view.getUint32(valueOffset + 4, little);
    const min = view.getUint32(valueOffset + 8, little) / view.getUint32(valueOffset + 12, little);
    const sec = view.getUint32(valueOffset + 16, little) / view.getUint32(valueOffset + 20, little);
    return deg + min / 60 + sec / 3600;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------
// Hash perceptual (aHash 8x8) + desenfoque (varianza de Laplace):
// puro canvas, sin dependencias, cero coste, cero límite.
// -----------------------------------------------------------------
function analyzeBitmap(bitmap: ImageBitmap): { phash: string; blurScore: number } {
  const canvas = document.createElement("canvas");
  const SIZE = 64; // suficiente para el desenfoque; el hash reduce esto a 8x8 aparte
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

  const gray = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const r = data[i * 4]!;
    const g = data[i * 4 + 1]!;
    const b = data[i * 4 + 2]!;
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  return { phash: averageHash(gray, SIZE), blurScore: laplacianVariance(gray, SIZE) };
}

function averageHash(gray: Float32Array, size: number): string {
  // Reduce a 8x8 promediando bloques, luego compara cada píxel con la media.
  const HASH_SIZE = 8;
  const block = size / HASH_SIZE;
  const small = new Float32Array(HASH_SIZE * HASH_SIZE);
  for (let y = 0; y < HASH_SIZE; y++) {
    for (let x = 0; x < HASH_SIZE; x++) {
      let sum = 0;
      for (let by = 0; by < block; by++) {
        for (let bx = 0; bx < block; bx++) {
          sum += gray[(y * block + by) * size + (x * block + bx)]!;
        }
      }
      small[y * HASH_SIZE + x] = sum / (block * block);
    }
  }
  const mean = small.reduce((a, b) => a + b, 0) / small.length;

  let bits = "";
  let hex = "";
  for (let i = 0; i < small.length; i++) {
    bits += small[i]! >= mean ? "1" : "0";
    if (bits.length === 4) {
      hex += parseInt(bits, 2).toString(16);
      bits = "";
    }
  }
  return hex;
}

function laplacianVariance(gray: Float32Array, size: number): number {
  const lap: number[] = [];
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = y * size + x;
      const value =
        -4 * gray[idx]! + gray[idx - 1]! + gray[idx + 1]! + gray[idx - size]! + gray[idx + size]!;
      lap.push(value);
    }
  }
  const mean = lap.reduce((a, b) => a + b, 0) / lap.length;
  const variance = lap.reduce((a, b) => a + (b - mean) ** 2, 0) / lap.length;
  return variance;
}

/** Distancia de Hamming entre dos hashes hex — para detectar casi-duplicados (spec). Cuanto más bajo, más parecidas. */
export function hammingDistanceHex(a: string, b: string): number {
  if (a.length !== b.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16);
    distance += diff.toString(2).split("1").length - 1;
  }
  return distance;
}

// -----------------------------------------------------------------
// Clasificación de qué aparece en la foto: TensorFlow.js + MobileNet,
// cargado bajo demanda desde un CDN público (como el widget de Google
// Translate que ya usa la web) — modelo abierto, gratis, sin clave,
// corre en el propio navegador y no tiene límite de usos.
// -----------------------------------------------------------------
declare global {
  interface Window {
    tf?: any;
    mobilenet?: { load: (opts?: any) => Promise<any> };
  }
}

let modelPromise: Promise<any | null> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("script load error")));
      if ((existing as HTMLScriptElement).dataset.loaded === "1") resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      resolve();
    };
    script.onerror = () => reject(new Error("script load error"));
    document.body.appendChild(script);
  });
}

async function getModel(): Promise<any | null> {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    try {
      if (!window.tf) {
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js");
      }
      if (!window.mobilenet) {
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js");
      }
      if (!window.mobilenet) return null;
      return await window.mobilenet.load({ version: 2, alpha: 1.0 });
    } catch {
      // Sin conexión al CDN, bloqueado, o navegador sin soporte: la
      // app sigue funcionando, simplemente sin etiquetas automáticas.
      return null;
    }
  })();
  return modelPromise;
}

/** Diccionario reducido: de las 1000 clases de ImageNet a etiquetas en español, útiles para agrupar momentos. */
const LABEL_MAP: Array<[RegExp, string]> = [
  [/seashore|sandbar|promontory|cliff|coast/i, "playa"],
  [/alp|mountain|volcano|valley/i, "montaña"],
  [/restaurant|menu|plate|dining|dessert|pizza|ice cream|wine|cocktail|cup|coffee/i, "comida"],
  [/dog|cat|bird|animal|puppy|kitten/i, "animal"],
  [/people|groom|bride|suit|dress/i, "celebración"],
  [/forest|tree|jungle|vegetation/i, "naturaleza"],
  [/lakeside|lake|river|fountain|waterfall/i, "agua"],
  [/stadium|ball|racket|ski|surf|skateboard|bicycle/i, "deporte"],
  [/castle|palace|church|monastery|tower|dome|building|skyscraper/i, "edificio"],
  [/car|convertible|limousine|airplane|train|boat|ship/i, "viaje"],
  [/stage|concert|microphone/i, "evento"],
  [/sunglasses|swimming|umbrella/i, "verano"],
  [/nightclub|fireworks/i, "noche"],
];

function mapLabelToTag(label: string): string | null {
  for (const [re, tag] of LABEL_MAP) {
    if (re.test(label)) return tag;
  }
  return null;
}

async function classifyBitmap(bitmap: ImageBitmap): Promise<string[]> {
  try {
    const model = await getModel();
    if (!model) return [];
    const predictions: Array<{ className: string; probability: number }> = await model.classify(bitmap, 5);
    const tags = new Set<string>();
    for (const p of predictions) {
      if (p.probability < 0.12) continue;
      const tag = mapLabelToTag(p.className);
      if (tag) tags.add(tag);
    }
    return Array.from(tags);
  } catch {
    return [];
  }
}

// -----------------------------------------------------------------
// Vídeos: un fotograma representativo, vía <video>+<canvas> ocultos.
// -----------------------------------------------------------------
function extractVideoFrame(file: File, atRatio: number): Promise<ImageBitmap | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => URL.revokeObjectURL(url);
    const fail = () => {
      cleanup();
      resolve(null);
    };

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.max(0, video.duration * atRatio);
    });
    video.addEventListener("seeked", async () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const bitmap = await createImageBitmap(canvas);
        cleanup();
        resolve(bitmap);
      } catch {
        fail();
      }
    });
    video.addEventListener("error", fail);
    setTimeout(fail, 8000); // nunca bloquear la subida indefinidamente
  });
}
