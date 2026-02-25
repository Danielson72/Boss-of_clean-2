'use client';

import { ProviderCard, ProviderCardSkeleton, type ProviderCardProps } from './ProviderCard';
import { EmptySearchState } from './EmptySearchState';

interface SearchResultsGridProps {
  providers: ProviderCardProps[];
  isLoading: boolean;
  totalCount: number;
  searchLocation?: string;
  searchService?: string;
}

export function SearchResultsGrid({
  providers,
  isLoading,
  totalCount,
  searchLocation,
  searchService,
}: SearchResultsGridProps) {
  if (isLoading) {
    return (
      <div>
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <ProviderCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <EmptySearchState
        searchLocation={searchLocation}
        searchService={searchService}
      />
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        Showing {providers.length} of {totalCount} professional{totalCount !== 1 ? 's' : ''}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {providers.map((provider) => (
          <ProviderCard key={provider.id} {...provider} />
        ))}
      </div>
    </div>
  );
}
