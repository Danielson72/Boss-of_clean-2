'use client';

import { X, Clock } from 'lucide-react';
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
    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6">
      <span className="flex items-center gap-1 text-xs font-medium text-gray-400 flex-shrink-0">
        <Clock className="h-3 w-3" />
        Recent:
      </span>
      {searches.map((search) => (
        <button
          key={search.id}
          type="button"
          onClick={() => onSelect(search.filters)}
          className="group flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-gold/40 rounded-full px-3 py-1.5 text-sm text-brand-dark flex-shrink-0 transition-colors min-h-[32px]"
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
            className="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Remove "${search.label}" from recent searches`}
          >
            <X className="h-3 w-3" />
          </span>
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-gray-400 hover:text-brand-gold flex-shrink-0 ml-1 transition-colors"
      >
        Clear
      </button>
    </div>
  );
}
