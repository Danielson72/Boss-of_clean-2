'use client';

import { useState } from 'react';
import { Filter, ChevronDown, BadgeCheck, X, Star, Calendar, ArrowUpDown } from 'lucide-react';
import { LocationAutocomplete } from './LocationAutocomplete';

export type AvailabilityFilter = 'any' | 'today' | 'this_week' | 'next_week';

export type SortByOption = 'recommended' | 'rating' | 'price' | 'experience' | 'distance';

export interface SearchFiltersState {
  location: string;
  selectedZip: string;
  selectedService: string;
  selectedServices: string[];
  priceRange: [number, number];
  minRating: number;
  availability: AvailabilityFilter;
  experienceMin: number;
  verifiedOnly: boolean;
  certifiedOnly: boolean;
  instantBookingOnly: boolean;
  sortBy: SortByOption;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onFiltersChange: (filters: SearchFiltersState) => void;
  serviceTypes: string[];
  zipCodes: string[];
}

export function SearchFilters({
  filters,
  onFiltersChange,
  serviceTypes,
  zipCodes
}: SearchFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = <K extends keyof SearchFiltersState>(
    key: K,
    value: SearchFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      location: '',
      selectedZip: '',
      selectedService: '',
      selectedServices: [],
      priceRange: [0, 200],
      minRating: 0,
      availability: 'any',
      experienceMin: 0,
      verifiedOnly: false,
      certifiedOnly: false,
      instantBookingOnly: false,
      sortBy: 'recommended',
    });
  };

  const toggleService = (service: string) => {
    const current = filters.selectedServices || [];
    const updated = current.includes(service)
      ? current.filter(s => s !== service)
      : [...current, service];
    updateFilter('selectedServices', updated);
  };

  const hasActiveFilters =
    filters.location ||
    filters.selectedZip ||
    filters.selectedService ||
    (filters.selectedServices && filters.selectedServices.length > 0) ||
    filters.priceRange[1] < 200 ||
    filters.minRating > 0 ||
    filters.availability !== 'any' ||
    filters.experienceMin > 0 ||
    filters.verifiedOnly ||
    filters.certifiedOnly ||
    filters.instantBookingOnly ||
    (filters.sortBy && filters.sortBy !== 'recommended');

  const activeFilterCount = [
    filters.location || filters.selectedZip,
    filters.selectedService || (filters.selectedServices && filters.selectedServices.length > 0),
    filters.priceRange[1] < 200,
    filters.minRating > 0,
    filters.availability !== 'any',
    filters.experienceMin > 0,
    filters.verifiedOnly,
    filters.certifiedOnly,
    filters.instantBookingOnly,
    filters.sortBy && filters.sortBy !== 'recommended',
  ].filter(Boolean).length;

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Find Professional Cleaners in Florida
        </h1>

        {/* Main Search Form */}
        <form role="search" onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Location Input with Autocomplete */}
          <LocationAutocomplete
            value={filters.location}
            onChange={(val) => updateFilter('location', val)}
            onSelectLocation={(loc) => {
              onFiltersChange({
                ...filters,
                location: `${loc.city}, FL`,
                selectedZip: loc.zip_code,
              });
            }}
          />

          {/* ZIP Code Dropdown */}
          <div>
            <label htmlFor="zip-select" className="sr-only">Select ZIP Code</label>
            <select
              id="zip-select"
              value={filters.selectedZip}
              onChange={(e) => updateFilter('selectedZip', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select ZIP Code</option>
              {zipCodes.map(zip => (
                <option key={zip} value={zip}>{zip}</option>
              ))}
            </select>
          </div>

          {/* Service Type */}
          <div>
            <label htmlFor="service-select" className="sr-only">Select Service Type</label>
            <select
              id="service-select"
              value={filters.selectedService}
              onChange={(e) => updateFilter('selectedService', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Services</option>
              {serviceTypes.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
          </div>

          {/* Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-expanded={showAdvanced}
            aria-controls="advanced-filters"
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px]" aria-label={`${activeFilterCount} active filters`}>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </form>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div id="advanced-filters" className="mt-6 p-4 bg-gray-50 rounded-lg" role="region" aria-label="Advanced search filters">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-700" id="advanced-filters-heading">Advanced Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="Clear all filters"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Minimum Rating */}
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">
                  <Star className="h-4 w-4 inline mr-1 text-yellow-500" aria-hidden="true" />
                  Minimum Rating
                </legend>
                <div className="flex gap-1" role="radiogroup" aria-label="Select minimum rating">
                  {[0, 1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => updateFilter('minRating', rating)}
                      className={`flex items-center justify-center px-3 py-2 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        filters.minRating === rating
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                      role="radio"
                      aria-checked={filters.minRating === rating}
                      aria-label={rating === 0 ? 'Any rating' : `${rating} stars minimum`}
                    >
                      {rating === 0 ? 'Any' : (
                        <span className="flex items-center gap-0.5">
                          {rating}
                          <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>

              {/* Availability */}
              <div>
                <label htmlFor="availability-select" className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-1 text-blue-500" aria-hidden="true" />
                  Availability
                </label>
                <select
                  id="availability-select"
                  value={filters.availability}
                  onChange={(e) => updateFilter('availability', e.target.value as AvailabilityFilter)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="any">Any Time</option>
                  <option value="today">Available Today</option>
                  <option value="this_week">This Week</option>
                  <option value="next_week">Next Week</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label htmlFor="price-range" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price: ${filters.priceRange[1] >= 200 ? '200+' : filters.priceRange[1]}/hour
                </label>
                <input
                  id="price-range"
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={filters.priceRange[1]}
                  onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
                  className="w-full accent-blue-600"
                  aria-valuemin={20}
                  aria-valuemax={200}
                  aria-valuenow={filters.priceRange[1]}
                  aria-valuetext={`$${filters.priceRange[1] >= 200 ? '200+' : filters.priceRange[1]} per hour maximum`}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1" aria-hidden="true">
                  <span>$20</span>
                  <span>$200+</span>
                </div>
              </div>

              {/* Experience */}
              <div>
                <label htmlFor="experience-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Experience
                </label>
                <select
                  id="experience-select"
                  value={filters.experienceMin}
                  onChange={(e) => updateFilter('experienceMin', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Any Experience</option>
                  <option value={1}>1+ Years</option>
                  <option value={3}>3+ Years</option>
                  <option value={5}>5+ Years</option>
                  <option value={10}>10+ Years</option>
                </select>
              </div>
            </div>

            {/* Sort By */}
            <div className="mt-6">
              <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-2">
                <ArrowUpDown className="h-4 w-4 inline mr-1 text-gray-500" aria-hidden="true" />
                Sort By
              </label>
              <select
                id="sort-select"
                value={filters.sortBy || 'recommended'}
                onChange={(e) => updateFilter('sortBy', e.target.value as SortByOption)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recommended">Recommended</option>
                <option value="rating">Highest Rated</option>
                <option value="price">Lowest Price</option>
                <option value="experience">Most Experienced</option>
                <option value="distance" disabled={!filters.selectedZip}>
                  Nearest{!filters.selectedZip ? ' (select a ZIP first)' : ''}
                </option>
              </select>
            </div>

            {/* Service Types Checkboxes */}
            <fieldset className="mt-6">
              <legend className="block text-sm font-medium text-gray-700 mb-3">
                Service Types
                {filters.selectedServices && filters.selectedServices.length > 0 && (
                  <span className="ml-2 text-blue-600" aria-live="polite">({filters.selectedServices.length} selected)</span>
                )}
              </legend>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2" role="group">
                {serviceTypes.map((service) => (
                  <label
                    key={service}
                    className={`flex items-center p-2 rounded-md cursor-pointer border transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                      (filters.selectedServices || []).includes(service)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={(filters.selectedServices || []).includes(service)}
                      onChange={() => toggleService(service)}
                      className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      aria-label={`Filter by ${service}`}
                    />
                    <span className="text-sm text-gray-700 truncate">{service}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Quick Filters Row */}
            <fieldset className="mt-6">
              <legend className="sr-only">Quick filter options</legend>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 rounded p-1">
                  <input
                    type="checkbox"
                    checked={filters.instantBookingOnly}
                    onChange={(e) => updateFilter('instantBookingOnly', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Instant booking only
                  </span>
                </label>
                <label className="flex items-center cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 rounded p-1">
                  <input
                    type="checkbox"
                    checked={filters.certifiedOnly}
                    onChange={(e) => updateFilter('certifiedOnly', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4 text-green-600" aria-hidden="true" />
                    Boss of Clean Certified
                  </span>
                </label>
                <label className="flex items-center cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 rounded p-1">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => updateFilter('verifiedOnly', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Reviewed professionals only
                  </span>
                </label>
              </div>
            </fieldset>
          </div>
        )}
      </div>
    </div>
  );
}
