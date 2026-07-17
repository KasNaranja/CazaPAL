// ─────────────────────────────────────────────────────────────
// Persistence — file-based (no native modules, so the Electron .exe packages
// cleanly). Single-user by design.
//
//   • analysis cache  → persisted to a JSON file, keyed by vintedId, so we
//                       never re-pay for vision analysis of already-seen items.
//   • searches        → kept in memory (transient per server process); the UI
//                       polls within the same process while a search is live.
//
// Node runtime only.
// ─────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import type {
  Listing,
  LanguageVerdict,
  MarketSource,
  SearchMeta,
} from "./types";

interface CacheEntry {
  verdict: LanguageVerdict;
  evidence: string | null;
  analyzedAt: string;
}

function resolveFile(): string {
  if (config.dbPath) return config.dbPath;
  const dir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "cache.json");
}

let _cache: Record<string, CacheEntry> | null = null;
let _file = "";
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function cache(): Record<string, CacheEntry> {
  if (_cache) return _cache;
  _file = resolveFile();
  try {
    if (fs.existsSync(_file)) {
      _cache = JSON.parse(fs.readFileSync(_file, "utf8")) as Record<
        string,
        CacheEntry
      >;
    } else {
      _cache = {};
    }
  } catch {
    _cache = {};
  }
  return _cache;
}

function scheduleWrite() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try {
      const dir = path.dirname(_file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(_file, JSON.stringify(_cache), "utf8");
    } catch {
      /* best-effort */
    }
  }, 400);
}

// ── Analysis cache (cross-search, persisted) ───────────────────

export interface CachedVerdict {
  verdict: LanguageVerdict;
  evidence: string | null;
  analyzedAt: string;
}

/** Cache key namespaced by source so a Vinted id and a Wallapop id that happen
 *  to be equal never share (and cross-contaminate) a verdict. */
function cacheKey(source: MarketSource, vintedId: string): string {
  return `${source}:${vintedId}`;
}

export function getCachedVerdict(
  source: MarketSource,
  vintedId: string
): CachedVerdict | null {
  const e = cache()[cacheKey(source, vintedId)];
  return e ? { ...e } : null;
}

export function setCachedVerdict(
  source: MarketSource,
  vintedId: string,
  verdict: LanguageVerdict,
  evidence: string | null,
  analyzedAt: string
): void {
  cache()[cacheKey(source, vintedId)] = { verdict, evidence, analyzedAt };
  scheduleWrite();
}

// ── Searches + listings (in memory) ────────────────────────────

interface SearchRecord {
  meta: SearchMeta;
  listings: Listing[];
}

// Store the searches map on globalThis so it is shared across route module
// instances. In `next dev`, route handlers can be compiled into separate module
// graphs (and HMR swaps modules on edit), which would otherwise give the POST
// /search route and the GET /status route DIFFERENT in-memory maps — making
// every status poll 404. globalThis is the single shared surface across them.
const globalForDb = globalThis as unknown as {
  __cazapalSearches?: Map<string, SearchRecord>;
};
const searches: Map<string, SearchRecord> =
  globalForDb.__cazapalSearches ?? new Map<string, SearchRecord>();
globalForDb.__cazapalSearches = searches;

export function createSearch(meta: SearchMeta, listings: Listing[]): void {
  // Deep-ish copy so later mutations don't leak references.
  searches.set(meta.id, {
    meta,
    listings: listings.map((l) => ({ ...l })),
  });
}

export function getSearch(searchId: string): SearchMeta | null {
  return searches.get(searchId)?.meta ?? null;
}

export function getListings(searchId: string): Listing[] {
  const rec = searches.get(searchId);
  if (!rec) return [];
  return rec.listings.map((l) => ({ ...l }));
}

/**
 * Update a single listing's verdict inside a search (and the shared cache).
 *
 * `persist` controls whether the verdict is written to the cross-search cache.
 * Pass false for verdicts that came from a TRANSIENT failure (rate limit,
 * network, image download) so the listing is retried on the next search instead
 * of being stuck on a cached error. Genuine verdicts (es/other, or a real
 * front-cover-only inconclusive) persist so we never re-pay to analyze them.
 */
export function updateListingVerdict(
  searchId: string,
  source: MarketSource,
  vintedId: string,
  verdict: LanguageVerdict,
  evidence: string | null,
  analyzedAt: string,
  persist = true
): void {
  const rec = searches.get(searchId);
  if (rec) {
    const l = rec.listings.find(
      (x) => x.source === source && x.vintedId === vintedId
    );
    if (l) {
      l.languageVerdict = verdict;
      l.verdictEvidence = evidence;
      l.analyzedAt = analyzedAt;
    }
  }
  if (verdict !== "pending" && persist) {
    setCachedVerdict(source, vintedId, verdict, evidence, analyzedAt);
  }
}

/** Count of listings in a search that already have a non-pending verdict.
 *  Pass a source to count just that marketplace (for the per-source bars). */
export function countAnalyzed(searchId: string, source?: MarketSource): number {
  const rec = searches.get(searchId);
  if (!rec) return 0;
  return rec.listings.filter(
    (l) =>
      l.languageVerdict !== "pending" && (!source || l.source === source)
  ).length;
}
