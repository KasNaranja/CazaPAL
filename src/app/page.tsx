"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { SearchBox } from "@/components/SearchBox";
import { ConsoleChips } from "@/components/ConsoleChips";
import { RecentSearches } from "@/components/RecentSearches";
import { ProgressBar } from "@/components/ProgressBar";
import { Toggle } from "@/components/Toggle";
import { SortDropdown, type SortKey } from "@/components/SortDropdown";
import { Results } from "@/components/Results";
import { DemoBanner, EmptyState, ErrorState } from "@/components/States";
import { getStatus, postSearch, CazaApiError } from "@/lib/api";
import { useRecentSearches } from "@/lib/useRecentSearches";
import { MARKET_LABELS, MARKET_SOURCES } from "@/lib/types";
import type {
  ConsoleKey,
  Listing,
  MarketSource,
  SearchResponse,
  SourceInfo,
  SourceProgress,
} from "@/lib/types";

interface ActiveSearch {
  id: string;
  query: string;
  demo: boolean;
  demoReason: string | null;
  initial: Listing[];
  total: number;
  sources: Record<MarketSource, SourceInfo>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [consoleKey, setConsoleKey] = useState<ConsoleKey>("todas");
  const [active, setActive] = useState<ActiveSearch | null>(null);
  // "Solo en español" starts OFF so a fresh search shows every result; the user
  // turns it on when they want to filter. Also reset to OFF on each new search.
  const [soloEspanol, setSoloEspanol] = useState(false);
  const [sort, setSort] = useState<SortKey>("total");

  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmit = useRef<{ q: string; c: ConsoleKey } | null>(null);
  const { recent, add, clear } = useRecentSearches();

  const search = useMutation<SearchResponse, CazaApiError, { q: string; c: ConsoleKey }>(
    {
      mutationFn: ({ q, c }) => postSearch(q, c),
      onSuccess: (data) => {
        setActive({
          id: data.search.id,
          query: data.search.query,
          demo: data.search.demo,
          demoReason: data.demoReason ?? null,
          initial: data.listings,
          total: data.search.total,
          sources: data.search.sources,
        });
        add(data.search.query, consoleKey);
      },
    }
  );

  const status = useQuery({
    queryKey: ["status", active?.id],
    queryFn: () => getStatus(active!.id),
    enabled: !!active && active.total > 0,
    refetchInterval: (q) => (q.state.data?.done ? false : 1500),
  });

  const submit = useCallback(
    (q: string, c: ConsoleKey) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      lastSubmit.current = { q: trimmed, c };
      setActive(null);
      setSoloEspanol(false); // always unchecked after a new search
      search.mutate({ q: trimmed, c });
    },
    [search]
  );

  const onSubmit = () => submit(query, consoleKey);

  const retry = () => {
    if (lastSubmit.current) {
      submit(lastSubmit.current.q, lastSubmit.current.c);
    }
  };

  // Keyboard shortcuts: "/" focuses search, "s" toggles Solo en español.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if ((e.key === "s" || e.key === "S") && !typing && active) {
        e.preventDefault();
        setSoloEspanol((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const listings = status.data?.listings ?? active?.initial ?? [];
  const total = active?.total ?? 0;
  const showResults = !!active || search.isPending;

  // Live per-source progress for the two bars: prefer the polled status; before
  // the first poll, fall back to the initial per-source totals with 0 analyzed.
  const sourceProgress = (src: MarketSource): SourceProgress => {
    const live = status.data?.sources?.[src];
    if (live) return live;
    const init = active?.sources?.[src];
    return { total: init?.total ?? 0, analyzed: 0, error: init?.error ?? null };
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-24">
      {/* Header (logo + name) only on the landing screen. Once you've searched,
          the results view starts straight with the search bar, like Vinted. */}
      {!showResults && (
        <Header
          onLogoClick={() => {
            setActive(null);
            search.reset();
          }}
        />
      )}

      {!showResults ? (
        <section className="mx-auto max-w-2xl pt-10 sm:pt-20">
          <h1 className="text-center text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Encuentra tu juego <span className="text-brand-600">en español</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-center text-stone-500">
            Buscamos en Vinted, Wallapop y eBay y analizamos las fotos con IA para enseñarte solo
            las copias en castellano, de la más barata a la más cara.
          </p>

          <div className="mt-8">
            <SearchBox
              ref={inputRef}
              value={query}
              onChange={setQuery}
              onSubmit={onSubmit}
              loading={search.isPending}
            />
            <div className="mt-4">
              <ConsoleChips value={consoleKey} onChange={setConsoleKey} />
            </div>
          </div>

          <RecentSearches
            items={recent}
            onPick={(r) => {
              setQuery(r.query);
              setConsoleKey(r.console);
              submit(r.query, r.console);
            }}
            onClear={clear}
          />
        </section>
      ) : (
        <section className="pt-4">
          {/* Compact search bar */}
          <div className="mb-4">
            <SearchBox
              ref={inputRef}
              value={query}
              onChange={setQuery}
              onSubmit={onSubmit}
              loading={search.isPending}
              size="compact"
            />
            <div className="mt-3">
              <ConsoleChips value={consoleKey} onChange={setConsoleKey} />
            </div>
          </div>

          {search.isError ? (
            <div className="pt-10">
              <ErrorState message={search.error.message} onRetry={retry} />
            </div>
          ) : search.isPending ? (
            <SkeletonGrid />
          ) : active ? (
            <>
              {active.demo && (
                <div className="mb-4">
                  <DemoBanner reason={active.demoReason} />
                </div>
              )}

              {total === 0 ? (
                <div className="pt-10">
                  <EmptyState title="No hay anuncios de ese juego ahora mismo en Vinted, Wallapop ni eBay">
                    <p className="text-sm text-stone-500">
                      Prueba con otro título o revisa la ortografía.
                    </p>
                  </EmptyState>
                </div>
              ) : (
                <>
                  {/* Sticky controls */}
                  <div className="sticky top-0 z-20 -mx-4 border-b border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
                    <div className="space-y-2">
                      {MARKET_SOURCES.map((src) => {
                        const sp = sourceProgress(src);
                        return (
                          <ProgressBar
                            key={src}
                            label={MARKET_LABELS[src]}
                            analyzed={sp.analyzed}
                            total={sp.total}
                            error={sp.error}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <Toggle
                        id="solo-es"
                        checked={soloEspanol}
                        onChange={setSoloEspanol}
                        label="Solo en español"
                      />
                      <SortDropdown value={sort} onChange={setSort} />
                    </div>
                  </div>

                  <div className="pt-5">
                    <Results
                      key={active.id}
                      listings={listings}
                      soloEspanol={soloEspanol}
                      sort={sort}
                    />
                  </div>
                </>
              )}
            </>
          ) : null}
        </section>
      )}

      <Footer />
    </main>
  );
}

function Header({ onLogoClick }: { onLogoClick: () => void }) {
  return (
    <header className="flex items-center py-5">
      <button
        type="button"
        onClick={onLogoClick}
        className="flex items-center gap-2"
        aria-label="Volver al inicio"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-black text-white">
          ✦
        </span>
        <span className="text-xl font-extrabold tracking-tight text-stone-900">
          Caza<span className="text-brand-600">PAL</span>
        </span>
      </button>
    </header>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-2.5 pt-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
        >
          <div className="aspect-[3/4] w-full animate-pulseSoft bg-stone-100" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-4/5 animate-pulseSoft rounded bg-stone-100" />
            <div className="h-4 w-2/5 animate-pulseSoft rounded bg-stone-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 border-t border-stone-200 pt-6 text-center text-xs text-stone-400">
      <p>
        CazaPAL analiza fotos públicas de anuncios de Vinted, Wallapop y eBay con IA. Los
        veredictos son orientativos: confirma siempre con el vendedor antes de
        comprar. Atajos: <kbd className="rounded border px-1">/</kbd> buscar ·{" "}
        <kbd className="rounded border px-1">s</kbd> solo en español.
      </p>
    </footer>
  );
}
