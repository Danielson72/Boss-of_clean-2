'use client';

import { Search } from 'lucide-react';
import { CleanerCard, CleanerCardSkeleton, CleanerCardProps } from './CleanerCard';

interface SearchResultsGridProps {
  cleaners: CleanerCardProps[];
  isLoading: boolean;
  totalCount: number;
  onRequestQuote?: (cleanerId: string) => void;
  onClearFilters?: () => void;
}

export function SearchResultsGrid({
  cleaners,
  isLoading,
  totalCount,
  onRequestQuote,
  onClearFilters
}: SearchResultsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <CleanerCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (cleaners.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No cleaners found</h3>
        <p className="text-gray-600 mb-6">
          Try adjusting your search criteria or expanding your location area.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          Showing {cleaners.length} of {totalCount} cleaner{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cleaners.map((cleaner) => (
          <CleanerCard
            key={cleaner.id}
            {...cleaner}
            onRequestQuote={onRequestQuote}
          />
        ))}
      </div>
    </div>
  );
}
