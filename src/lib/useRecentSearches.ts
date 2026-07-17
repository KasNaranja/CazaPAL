"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConsoleKey } from "./types";

const KEY = "cazapal:recent-searches";
const MAX = 5;

export interface RecentSearch {
  query: string;
  console: ConsoleKey;
}

export function useRecentSearches() {
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: RecentSearch[]) => {
    setRecent(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const add = useCallback(
    (query: string, consoleKey: ConsoleKey) => {
      const q = query.trim();
      if (!q) return;
      setRecent((prev) => {
        const next = [
          { query: q, console: consoleKey },
          ...prev.filter(
            (r) => r.query.toLowerCase() !== q.toLowerCase()
          ),
        ].slice(0, MAX);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => persist([]), [persist]);

  return { recent, add, clear };
}
