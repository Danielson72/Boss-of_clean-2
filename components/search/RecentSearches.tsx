'use client';

import { X } from 'lucide-react';
import type { RecentSearch } from '@/lib/hooks/useSearchHistory';

interface RecentSearchesProps {
  searches: RecentSearch[];
  onSelect: (filters: RecentSearch['filters']) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function RecentSearches({
  searches,
  onSelect,
  onRemove,
  onClear,
}: RecentSearchesProps) {
  if (searches.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">
          Recent:
        </span>
        {searches.map((search) => (
          <button
            key={search.id}
            type="button"
            onClick={() => onSelect(search.filters)}
            className="group flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700 flex-shrink-0 transition-colors"
          >
            <span className="truncate max-w-[200px]">{search.label}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(search.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onRemove(search.id);
                }
              }}
              className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Remove "${search.label}" from recent searches`}
            >
              <X className="h-3 w-3" />
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0 ml-1"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
