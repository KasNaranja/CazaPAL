// ─────────────────────────────────────────────────────────────
// Vision analysis via Google Gemini (free tier, multimodal).
//
// Given up to 2 photos of a physical game copy, decide whether the copy is in
// Spanish. Uses the Gemini REST endpoint (no SDK dependency, easier to package
// inside Electron) and forces a STRICT JSON reply via responseSchema.
//
// The key stays server-side. Node runtime only.
// ─────────────────────────────────────────────────────────────

import { config, COST_GUARD } from "./config";
import type { VisionResult } from "./types";

const SYSTEM_PROMPT = `Eres un experto en videojuegos físicos del mercado europeo (PAL) e identificas, a partir de las fotos de la carátula y la contraportada, si una copia está en español y de qué forma.

Debes clasificar la copia en UNA de estas cuatro categorías:

1) "es" = EDICIÓN ESPAÑOLA. La propia carátula/contraportada está en español: la descripción o sinopsis del reverso está redactada en castellano, o lleva sello "PAL España"/"PAL ESP"/"Totalmente en castellano", o distribuidora española (Sony España, Nintendo Ibérica, Proein, Erbe, FX Interactive). Es una copia pensada para el mercado español.

2) "es_multi" = OTRO IDIOMA EN LA CAJA, PERO INCLUYE ESPAÑOL. El texto de marketing/sinopsis de la contraportada está en OTRO idioma (francés, italiano, alemán, inglés…), PERO en la lista técnica de idiomas del juego (secciones "VOIX"/"VOCI"/"LANGUAGES"/"IDIOMAS"/"VOZ"/"TEXTO"/"AUDIO"/"SUBTÍTULOS") aparece "ES" o "Español". Es un disco multi-idioma que SE PUEDE JUGAR en español aunque la caja no sea la edición española. Típico en juegos modernos de PS4/PS5/Switch/Xbox.

3) "other" = SIN ESPAÑOL. La contraportada está en otro idioma y NO aparece "ES"/"Español" por ninguna parte (ni en el texto ni en la lista de idiomas).

4) "inconclusive" = no se puede determinar: fotos borrosas/cortadas, o no hay NINGÚN texto legible que revele el idioma (ni en la portada ni en la contraportada).

SEÑALES DE LA PORTADA (FRONTAL) — MUY IMPORTANTE, úsalas aunque no haya contraportada:
La carátula frontal de los juegos modernos SÍ revela el idioma de la edición. Míralas siempre:
- La FRANJA/BANDA AZUL de PlayStation (arriba a la izquierda, junto al PEGI) con el aviso de mejora a PS5: su idioma indica la edición.
  · "Actualización disponible para PS5" / "Se requiere..." → ESPAÑOL (señal de "es").
  · "Aggiornamento disponibile per PS5" → ITALIANO (→ "other", salvo que veas ES en la lista de idiomas del reverso).
  · "Mise à niveau disponible sur PS5" → FRANCÉS (→ "other", salvo ES en la lista).
  · "Upgrade available for PS5" / "Free upgrade" → INGLÉS.
- El texto del PEGI y los descriptores ("Violencia"/"Violence"/"Violenza"; "Lenguaje soez"/"Bad Language"/"Linguaggio scurrile").
- Pegatinas de tienda/precio: una etiqueta española (p. ej. "PVP", "€", tienda española) apoya "es"; "DEST. VENDITA" u otras en italiano apuntan a edición italiana.
Si SOLO tienes la portada pero esa franja/PEGI/pegatina se lee claramente en un idioma, clasifícala por ese idioma (no la dejes en "inconclusive"). Solo usa "inconclusive" si de verdad no se lee nada.

REGLAS CLAVE:
- Distingue idiomas de verdad LEYENDO las palabras. El francés se parece al español pero NO es español: "JEU", "LANGUE", "Bienvenue", "monde", "vous", "avec", "ATTENTION", "disponible", "ans", acentos à/è/ç → francés. Italiano: "GIOCO", "lingua", "Benvenuto", "gli". Alemán: "SPIEL", "Sprache", "und", "für", "ß".
- La diferencia entre "es" y "es_multi" es DÓNDE está el español: si el TEXTO de la contraportada está en castellano → "es". Si el texto está en otro idioma pero la LISTA de idiomas incluye ES → "es_multi".
- Busca activamente la fila de idiomas: suele ser una línea tipo "EN / FR / IT / DE / ES / PT" cerca de los iconos de jugadores/tamaño. Si ves "ES" ahí y el resto de la caja es de otro idioma → "es_multi".
- Ante duda entre "es" y "es_multi", elige "es_multi". Ante duda de si hay español o no, y no lo ves claro → "other" o "inconclusive"; no inventes.

El campo "evidence" debe ser UNA sola frase en español citando la evidencia concreta vista (qué palabras, en qué idioma, y si viste "ES" en la lista de idiomas).`;

const USER_PROMPT = `Analiza estas fotos de una copia de un videojuego a la venta. ¿Está en español?`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    verdict: {
      type: "string",
      enum: ["es", "es_multi", "other", "inconclusive"],
    },
    evidence: { type: "string" },
  },
  required: ["verdict", "evidence"],
};

const MAX_BYTES = 5 * 1024 * 1024; // keep well under Gemini limits
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ImagePart {
  mimeType: string;
  data: string; // base64
}

async function downloadImage(url: string): Promise<ImagePart | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    let mt = (res.headers.get("content-type") || "").split(";")[0].trim();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null;
    if (!ALLOWED.has(mt)) {
      if (buf[0] === 0xff && buf[1] === 0xd8) mt = "image/jpeg";
      else if (buf[0] === 0x89 && buf[1] === 0x50) mt = "image/png";
      else return null;
    }
    return { mimeType: mt, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

// ── Free-tier rate limiter ─────────────────────────────────────
// Gemini's free tier caps requests per minute. We serialize calls with a
// minimum interval so a big search stays under the cap instead of getting 429s.
let lastCallAt = 0;
let chain: Promise<void> = Promise.resolve();
function throttle(): Promise<void> {
  chain = chain.then(async () => {
    const wait = config.geminiMinIntervalMs - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
  });
  return chain;
}

function parseVerdict(text: string): VisionResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let obj: any;
  try {
    obj = JSON.parse(match[0]);
  } catch {
    return null;
  }
  const v = obj?.verdict;
  if (v !== "es" && v !== "es_multi" && v !== "other" && v !== "inconclusive")
    return null;
  const evidence =
    typeof obj?.evidence === "string" && obj.evidence.trim()
      ? obj.evidence.trim()
      : v === "es"
        ? "La contraportada muestra textos en español (edición española)."
        : v === "es_multi"
          ? "La caja es de otro idioma, pero la lista de idiomas incluye español (ES)."
          : v === "other"
            ? "La copia está en otro idioma según las fotos."
            : "No hay evidencia suficiente para confirmar el idioma.";
  return { verdict: v, evidence };
}

/**
 * Analyze up to 2 photo URLs and return a verdict. Throws on a hard API error
 * so the caller can degrade to "inconclusive".
 */
export async function analyzeImages(imageUrls: string[]): Promise<VisionResult> {
  if (!config.geminiKey) {
    throw new Error("Falta GEMINI_API_KEY para el análisis de visión.");
  }

  const parts = (
    await Promise.all(
      imageUrls.slice(0, COST_GUARD.MAX_IMAGES_PER_LISTING).map(downloadImage)
    )
  ).filter((p): p is ImagePart => p !== null);

  if (parts.length === 0) {
    // Image download failed — transient. Throw so the caller degrades to a
    // NON-persisted inconclusive (retried next search) rather than caching it.
    throw new Error("image_download_failed");
  }

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          ...parts.map((p) => ({
            inline_data: { mime_type: p.mimeType, data: p.data },
          })),
          { text: USER_PROMPT },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 300,
      temperature: 0,
    },
  };

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(config.geminiModel)}:generateContent`;

  // Retry transient failures (429 rate-limit, 503 overload). On the free tier
  // these are common under load; since images cost nothing, retrying a couple
  // of times recovers a real verdict instead of degrading to "inconclusive".
  const MAX_ATTEMPTS = 3;
  let res!: Response;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await throttle();
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiKey,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status === 503) {
      if (attempt < MAX_ATTEMPTS) {
        // Back off progressively before the next attempt (throttle adds more).
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      throw new Error(
        res.status === 429 ? "gemini_rate_limited" : "gemini_overloaded"
      );
    }
    break;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`gemini_http_${res.status}: ${detail.slice(0, 200)}`);
  }

  const data: any = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text || "")
      .join("") || "";

  const parsed = parseVerdict(text);
  if (!parsed) {
    return {
      verdict: "inconclusive",
      evidence: "El análisis no devolvió un resultado claro sobre el idioma.",
    };
  }
  return parsed;
}
