import { NextResponse } from "next/server";
import { config, COST_GUARD, isDemoMode } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico seguro del despliegue. NUNCA expone claves ni secretos: solo
 * CUÁNTAS claves de Gemini ve la app (para verificar que las variables de
 * entorno se han cargado bien) y qué fuentes están activas.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    geminiKeys: config.geminiKeys.length,
    geminiModel: config.geminiModel,
    geminiMinIntervalMs: config.geminiMinIntervalMs,
    demo: isDemoMode(),
    cacheEnabled: config.cacheEnabled,
    maxListingsPerSource: COST_GUARD.MAX_LISTINGS_PER_SEARCH,
    sources: {
      vinted: config.vintedEnabled,
      wallapop: config.wallapopEnabled,
      ebay: !!(config.ebayClientId && config.ebayClientSecret),
    },
  });
}
