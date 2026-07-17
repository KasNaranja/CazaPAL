import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { config, COST_GUARD, demoReason, isDemoMode } from "@/lib/config";
import { createSearch } from "@/lib/db";
import { getDemoListings } from "@/lib/demo";
import { cleanListings } from "@/lib/filter";
import { startAnalysis } from "@/lib/analyzer";
import { searchListings as searchVinted, VintedError } from "@/lib/vinted";
import {
  searchListings as searchWallapop,
  WallapopError,
} from "@/lib/wallapop";
import type {
  ApiError,
  ConsoleKey,
  Listing,
  MarketSource,
  SearchMeta,
  SearchResponse,
  SourceInfo,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CONSOLES: ConsoleKey[] = [
  "todas",
  "ps1",
  "ps2",
  "ps3",
  "ps4",
  "ps5",
  "switch",
  "nintendo_handheld",
  "xbox",
  "otras",
];

const CAP = COST_GUARD.MAX_LISTINGS_PER_SEARCH;

interface SourceResult {
  listings: Listing[];
  error: string | null;
}

/** Fetch + clean one marketplace. Never throws: failures come back as `error`
 *  so one source going down doesn't take the other with it. */
async function fetchSource(
  label: string,
  fetcher: () => Promise<Listing[]>,
  query: string,
  consoleKey: ConsoleKey
): Promise<SourceResult> {
  try {
    const raw = await fetcher();
    const listings = cleanListings(raw, query, consoleKey).slice(0, CAP);
    return { listings, error: null };
  } catch (e) {
    let kind: string | undefined;
    if (e instanceof VintedError || e instanceof WallapopError) kind = e.kind;
    const error =
      kind === "blocked"
        ? `${label} ha bloqueado la petición. Inténtalo en un minuto.`
        : kind === "rate_limited"
          ? `${label} está limitando las peticiones. Inténtalo en un minuto.`
          : `${label} no responde ahora mismo. Inténtalo en un minuto.`;
    return { listings: [], error };
  }
}

/** Alternate two sources so background analysis fills BOTH progress bars at
 *  once instead of finishing one marketplace before starting the other. */
function interleave(a: Listing[], b: Listing[]): Listing[] {
  const out: Listing[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (i < a.length) out.push(a[i]);
    if (i < b.length) out.push(b[i]);
  }
  return out;
}

export async function POST(req: Request) {
  let body: { query?: string; console?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ApiError>(
      { error: "Cuerpo de la petición no válido.", code: "bad_request" },
      { status: 400 }
    );
  }

  const query = (body.query || "").trim();
  const consoleKey = (
    VALID_CONSOLES.includes(body.console as ConsoleKey) ? body.console : "todas"
  ) as ConsoleKey;

  if (!query) {
    return NextResponse.json<ApiError>(
      { error: "Escribe el nombre de un juego.", code: "bad_request" },
      { status: 400 }
    );
  }

  const demo = isDemoMode();
  let listings: Listing[] = [];
  let sources: Record<MarketSource, SourceInfo>;

  if (demo) {
    // Demo mode ignores the query filter and always serves the sample search
    // (bundled under Vinted; Wallapop stays empty offline).
    listings = getDemoListings(query).slice(0, CAP);
    sources = {
      vinted: { total: listings.length, error: null },
      wallapop: { total: 0, error: null },
    };
  } else {
    const [vintedRes, wallapopRes] = await Promise.all([
      config.vintedEnabled
        ? fetchSource(
            "Vinted",
            () => searchVinted(query, consoleKey, CAP),
            query,
            consoleKey
          )
        : Promise.resolve<SourceResult>({ listings: [], error: null }),
      config.wallapopEnabled
        ? fetchSource(
            "Wallapop",
            () => searchWallapop(query, consoleKey, CAP),
            query,
            consoleKey
          )
        : Promise.resolve<SourceResult>({ listings: [], error: null }),
    ]);

    listings = interleave(vintedRes.listings, wallapopRes.listings);
    sources = {
      vinted: { total: vintedRes.listings.length, error: vintedRes.error },
      wallapop: {
        total: wallapopRes.listings.length,
        error: wallapopRes.error,
      },
    };

    // Only a hard error if BOTH marketplaces failed and we have nothing.
    if (listings.length === 0 && vintedRes.error && wallapopRes.error) {
      return NextResponse.json<ApiError>(
        {
          error:
            "Ni Vinted ni Wallapop responden ahora mismo. Inténtalo en un minuto.",
          code: "sources_unavailable",
        },
        { status: 503 }
      );
    }
  }

  const meta: SearchMeta = {
    id: randomUUID(),
    query,
    console: consoleKey,
    createdAt: new Date().toISOString(),
    demo,
    total: listings.length,
    sources,
  };

  createSearch(meta, listings);

  // Fire-and-forget: analysis runs in the background; the UI polls /status.
  if (listings.length > 0) {
    void startAnalysis(meta.id);
  }

  const res: SearchResponse = {
    search: meta,
    listings,
    demoReason: demoReason(),
  };
  return NextResponse.json(res, { status: 200 });
}
