'use client';

import { Loader2 } from 'lucide-react';

interface LoadMorePaginationProps {
  currentCount: number;
  totalCount: number;
  isLoading: boolean;
  onLoadMore: () => void;
}

export function LoadMorePagination({
  currentCount,
  totalCount,
  isLoading,
  onLoadMore
}: LoadMorePaginationProps) {
  const hasMore = currentCount < totalCount;

  if (!hasMore) {
    return currentCount > 0 ? (
      <div className="text-center py-8">
        <p className="text-gray-400 text-sm">
          Showing all {totalCount} result{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10">
      <p className="text-gray-500 text-sm">
        Showing {currentCount} of {totalCount} professionals
      </p>
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="px-8 py-3 bg-white border border-gray-200 rounded-xl hover:border-brand-gold/40 hover:shadow-md transition-all font-semibold text-sm text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-h-[44px]"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          `Load More (${totalCount - currentCount} remaining)`
        )}
      </button>
    </div>
  );
}
