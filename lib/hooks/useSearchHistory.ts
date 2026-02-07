'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RecentSearch {
  id: string;
  label: string;
  filters: {
    location: string;
    selectedZip: string;
    selectedService: string;
  };
  timestamp: number;
}

const STORAGE_KEY = 'boc_search_history';

function readFromStorage(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeToStorage(searches: RecentSearch[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function useSearchHistory(maxItems = 5) {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setRecentSearches(readFromStorage());
  }, []);

  const addSearch = useCallback(
    (search: Omit<RecentSearch, 'id' | 'timestamp'>) => {
      setRecentSearches((prev) => {
        // Deduplicate by zip + service combo
        const dedupeKey =
          search.filters.selectedZip + '|' + search.filters.selectedService;
        const filtered = prev.filter(
          (s) =>
            s.filters.selectedZip + '|' + s.filters.selectedService !==
            dedupeKey
        );

        const newEntry: RecentSearch = {
          ...search,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };

        const updated = [newEntry, ...filtered].slice(0, maxItems);
        writeToStorage(updated);
        return updated;
      });
    },
    [maxItems]
  );

  const removeSearch = useCallback((id: string) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      writeToStorage(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRecentSearches([]);
    writeToStorage([]);
  }, []);

  return { recentSearches, addSearch, removeSearch, clearHistory };
}
