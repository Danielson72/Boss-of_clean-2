'use client';

import { useState } from 'react';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { SERVICE_TYPES } from '@/lib/data/service-types';

export type AvailabilityFilter = 'any' | 'today' | 'this_week' | 'next_week';
export type SortByOption = 'relevance' | 'newest' | 'name_az';
export type DistanceOption = '' | '5' | '10' | '25' | '50';

export interface SearchFiltersState {
  selectedService: string;
  selectedZip: string;
  location: string;
  distance: DistanceOption;
  availability: AvailabilityFilter;
  sortBy: SortByOption;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
  resultCount: number;
  isLoading: boolean;
}

const DISTANCE_OPTIONS: { value: DistanceOption; label: string }[] = [
  { value: '', label: 'Any Distance' },
  { value: '5', label: 'Within 5 miles' },
  { value: '10', label: 'Within 10 miles' },
  { value: '25', label: 'Within 25 miles' },
  { value: '50', label: 'Within 50 miles' },
];

const AVAILABILITY_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'any', label: 'Any Time' },
  { value: 'today', label: 'Available Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'next_week', label: 'Next Week' },
];

const SORT_OPTIONS: { value: SortByOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'name_az', label: 'Name A-Z' },
];

export function SearchFilters({
  filters,
  onFiltersChange,
  resultCount,
  isLoading,
}: SearchFiltersProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const updateFilter = <K extends keyof SearchFiltersState>(
    key: K,
    value: SearchFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.selectedService ||
    filters.distance ||
    filters.availability !== 'any' ||
    filters.sortBy !== 'relevance';

  const activeFilterCount = [
    filters.selectedService,
    filters.distance,
    filters.availability !== 'any',
    filters.sortBy !== 'relevance',
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      selectedService: '',
      distance: '',
      availability: 'any',
      sortBy: 'relevance',
    });
  };

  const FilterControls = () => (
    <div className="space-y-5">
      {/* Service Type */}
      <div>
        <label htmlFor="filter-service" className="block text-sm font-semibold text-brand-dark mb-2">
          Service Type
        </label>
        <div className="relative">
          <select
            id="filter-service"
            value={filters.selectedService}
            onChange={(e) => updateFilter('selectedService', e.target.value)}
            className="w-full px-4 py-3 bg-brand-cream border border-gray-200 rounded-xl text-brand-dark text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
          >
            <option value="">All Services</option>
            {SERVICE_TYPES.map((st) => (
              <option key={st.slug} value={st.shortName}>
                {st.shortName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Distance/Radius */}
      <div>
        <label htmlFor="filter-distance" className="block text-sm font-semibold text-brand-dark mb-2">
          Distance
        </label>
        <div className="relative">
          <select
            id="filter-distance"
            value={filters.distance}
            onChange={(e) => updateFilter('distance', e.target.value as DistanceOption)}
            disabled={!filters.selectedZip}
            className="w-full px-4 py-3 bg-brand-cream border border-gray-200 rounded-xl text-brand-dark text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {DISTANCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {!filters.selectedZip && (
          <p className="text-xs text-gray-400 mt-1">Enter a ZIP code to filter by distance</p>
        )}
      </div>

      {/* Availability */}
      <div>
        <label htmlFor="filter-availability" className="block text-sm font-semibold text-brand-dark mb-2">
          Availability
        </label>
        <div className="relative">
          <select
            id="filter-availability"
            value={filters.availability}
            onChange={(e) => updateFilter('availability', e.target.value as AvailabilityFilter)}
            className="w-full px-4 py-3 bg-brand-cream border border-gray-200 rounded-xl text-brand-dark text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
          >
            {AVAILABILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Sort By */}
      <div>
        <label htmlFor="filter-sort" className="block text-sm font-semibold text-brand-dark mb-2">
          Sort By
        </label>
        <div className="relative">
          <select
            id="filter-sort"
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value as SortByOption)}
            className="w-full px-4 py-3 bg-brand-cream border border-gray-200 rounded-xl text-brand-dark text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-brand-gold border border-brand-gold/30 rounded-xl hover:bg-brand-gold/5 transition-colors"
        >
          <X className="h-4 w-4" />
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar Filters */}
      <aside className="hidden lg:block" aria-label="Search filters">
        <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-bold text-brand-dark">Filters</h2>
            {!isLoading && (
              <span className="text-sm text-gray-500">
                {resultCount} result{resultCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <FilterControls />
        </div>
      </aside>

      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setShowMobileFilters(true)}
          className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-brand-dark hover:border-brand-gold/40 transition-colors w-full justify-center min-h-[44px]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-brand-gold text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Sheet (overlay) */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileFilters(false)}
          />

          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-6 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-brand-dark">Filters</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 -mr-2 text-gray-400 hover:text-brand-dark transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              <FilterControls />
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full bg-brand-gold text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-gold-light transition-colors min-h-[44px]"
              >
                Show {resultCount} Result{resultCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
