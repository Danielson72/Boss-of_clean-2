'use client';

import { useState } from 'react';
import { MapPin, Filter, ChevronDown, BadgeCheck, X } from 'lucide-react';

export interface SearchFiltersState {
  location: string;
  selectedZip: string;
  selectedService: string;
  priceRange: [number, number];
  experienceMin: number;
  verifiedOnly: boolean;
  certifiedOnly: boolean;
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
      priceRange: [0, 200],
      experienceMin: 0,
      verifiedOnly: false,
      certifiedOnly: false
    });
  };

  const hasActiveFilters =
    filters.location ||
    filters.selectedZip ||
    filters.selectedService ||
    filters.priceRange[1] < 200 ||
    filters.experienceMin > 0 ||
    filters.verifiedOnly ||
    filters.certifiedOnly;

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Find Professional Cleaners in Florida
        </h1>

        {/* Main Search Form */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Location Input */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Enter ZIP, city, or county"
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* ZIP Code Dropdown */}
          <select
            value={filters.selectedZip}
            onChange={(e) => updateFilter('selectedZip', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select ZIP Code</option>
            {zipCodes.map(zip => (
              <option key={zip} value={zip}>{zip}</option>
            ))}
          </select>

          {/* Service Type */}
          <select
            value={filters.selectedService}
            onChange={(e) => updateFilter('selectedService', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Services</option>
            {serviceTypes.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-gray-700">Advanced Filters</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Price: ${filters.priceRange[1]}/hour
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.priceRange[1]}
                  onChange={(e) => updateFilter('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$0</span>
                  <span>$200+</span>
                </div>
              </div>

              {/* Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Experience
                </label>
                <select
                  value={filters.experienceMin}
                  onChange={(e) => updateFilter('experienceMin', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value={0}>Any Experience</option>
                  <option value={1}>1+ Years</option>
                  <option value={3}>3+ Years</option>
                  <option value={5}>5+ Years</option>
                  <option value={10}>10+ Years</option>
                </select>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.certifiedOnly}
                    onChange={(e) => updateFilter('certifiedOnly', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                    Boss of Clean Certified only
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) => updateFilter('verifiedOnly', e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Verified cleaners only
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
