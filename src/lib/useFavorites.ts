"use client";

// Client-side favorites ("me gusta") saved in localStorage — no account needed.
// A tiny module-level store shared across all cards via useSyncExternalStore, so
// tapping the heart on one card keeps every card in sync and survives reloads.
// We store the whole Listing (keyed by source:id) so a future "favoritos" view
// can render them without re-searching.

import { useSyncExternalStore } from "react";
import type { Listing } from "./types";

const KEY = "palespana:favorites";
type FavMap = Record<string, Listing>;

const EMPTY: FavMap = {};

function keyOf(source: string, id: string): string {
  return `${source}:${id}`;
}

function read(): FavMap {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FavMap) : EMPTY;
  } catch {
    return EMPTY;
  }
}

let store: FavMap = read();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Add the listing if absent, remove it if present. Persists + notifies. */
export function toggleFavorite(listing: Listing): void {
  const k = keyOf(listing.source, listing.vintedId);
  const next: FavMap = { ...store };
  if (k in next) delete next[k];
  else next[k] = listing;
  store = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage full/blocked — keep it in memory at least */
  }
  emit();
}

export function useFavorites() {
  const map = useSyncExternalStore(
    subscribe,
    () => store,
    () => EMPTY
  );
  return {
    isFavorite: (source: string, id: string) => keyOf(source, id) in map,
    toggle: toggleFavorite,
    count: Object.keys(map).length,
    list: Object.values(map),
  };
}
