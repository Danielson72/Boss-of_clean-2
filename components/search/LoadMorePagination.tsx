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
        <p className="text-gray-500">
          Showing all {totalCount} result{totalCount !== 1 ? 's' : ''}
        </p>
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="text-gray-600">
        Showing {currentCount} of {totalCount} cleaners
      </p>
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
