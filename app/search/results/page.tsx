'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Star, Filter, Grid, List, Shield, Clock, DollarSign, Phone, Mail, ExternalLink } from 'lucide-react';
import { searchService, type Cleaner, type SearchFilters } from '@/lib/services/searchService';
import Link from 'next/link';

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Search filters state
  const [filters, setFilters] = useState<SearchFilters>({
    serviceType: searchParams?.get('service') || '',
    zipCode: searchParams?.get('zip') || '',
    minRating: 0,
    maxPrice: 0,
    instantBooking: false,
    verified: false,
    sortBy: 'rating' as const
  });

  // Load search results
  useEffect(() => {
    performSearch();
  }, [searchParams]);

  const performSearch = async () => {
    setLoading(true);
    setError('');
    
    try {
      const results = await searchService.searchCleaners({
        serviceType: searchParams?.get('service') || filters.serviceType || undefined,
        zipCode: searchParams?.get('zip') || filters.zipCode || undefined,
        minRating: (filters.minRating || 0) > 0 ? filters.minRating : undefined,
        maxPrice: (filters.maxPrice || 0) > 0 ? filters.maxPrice : undefined,
        instantBooking: filters.instantBooking || undefined,
        verified: filters.verified || undefined,
        sortBy: filters.sortBy
      });
      
      setCleaners(results);
    } catch (err) {
      setError('Failed to search cleaners. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters({ ...filters, ...newFilters });
  };

  const applyFilters = () => {
    performSearch();
    setShowFilters(false);
  };

  const getServiceTypeLabel = (serviceType: string) => {
    const serviceTypes = searchService.getServiceTypes();
    const service = serviceTypes.find(s => s.value === serviceType);
    return service?.label || serviceType;
  };

  const formatPrice = (hourlyRate: number, minimumHours: number) => {
    const minPrice = hourlyRate * minimumHours;
    return `$${hourlyRate}/hr (${minimumHours}hr min) • From $${minPrice}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Searching for cleaners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <select
                  value={filters.serviceType}
                  onChange={(e) => handleFilterChange({ serviceType: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">All Services</option>
                  {searchService.getServiceTypes().map(service => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ZIP code"
                  value={filters.zipCode}
                  onChange={(e) => handleFilterChange({ zipCode: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="rating">Sort by Rating</option>
                <option value="price">Sort by Price</option>
                <option value="experience">Sort by Experience</option>
                <option value="response_time">Sort by Response Time</option>
              </select>
            </div>
            
            <button 
              onClick={applyFilters}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-300"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {filters.serviceType ? getServiceTypeLabel(filters.serviceType) : 'Cleaning Services'} 
              {filters.zipCode && ` in ${filters.zipCode}`}
            </h1>
            <p className="text-gray-600">
              Found {cleaners.length} cleaning professional{cleaners.length !== 1 ? 's' : ''} near you
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-5 w-5" />
              Filters
            </button>
            
            <div className="flex border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Filter Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
                <select
                  value={filters.minRating}
                  onChange={(e) => handleFilterChange({ minRating: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Any Rating</option>
                  <option value={3}>3+ Stars</option>
                  <option value={4}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Hourly Rate
                </label>
                <select
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange({ maxPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value={0}>Any Price</option>
                  <option value={30}>Up to $30/hr</option>
                  <option value={50}>Up to $50/hr</option>
                  <option value={75}>Up to $75/hr</option>
                  <option value={100}>Up to $100/hr</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.instantBooking}
                    onChange={(e) => handleFilterChange({ instantBooking: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Instant Booking</span>
                </label>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.verified}
                    onChange={(e) => handleFilterChange({ verified: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Verified Only</span>
                </label>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={applyFilters}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
              >
                Apply Filters
              </button>
              <button
                onClick={() => {
                  setFilters({
                    serviceType: searchParams?.get('service') || '',
                    zipCode: searchParams?.get('zip') || '',
                    minRating: 0,
                    maxPrice: 0,
                    instantBooking: false,
                    verified: false,
                    sortBy: 'rating'
                  });
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition duration-300"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results Grid */}
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {cleaners.map((cleaner) => (
            <div key={cleaner.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300">
              {/* Business Image */}
              <div className="h-48 bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center">
                {cleaner.profile_image_url ? (
                  <img 
                    src={cleaner.profile_image_url} 
                    alt={cleaner.business_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-white text-lg font-semibold text-center p-4">
                    {cleaner.business_name}
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {cleaner.business_name}
                  </h3>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-gray-700 ml-1">
                      {cleaner.average_rating.toFixed(1)}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-2">
                  {cleaner.users?.full_name} • {cleaner.total_reviews} reviews • {cleaner.years_experience} years exp.
                </p>
                
                {/* Services */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {cleaner.services.slice(0, 3).map((service, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {getServiceTypeLabel(service)}
                    </span>
                  ))}
                  {cleaner.services.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{cleaner.services.length - 3} more
                    </span>
                  )}
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {cleaner.insurance_verified && (
                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      <Shield className="h-3 w-3 mr-1" />
                      Insured
                    </span>
                  )}
                  {cleaner.instant_booking && (
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      <Clock className="h-3 w-3 mr-1" />
                      Instant Booking
                    </span>
                  )}
                  {cleaner.subscription_tier === 'pro' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-semibold">
                      PRO
                    </span>
                  )}
                  {cleaner.subscription_tier === 'enterprise' && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-semibold">
                      FEATURED
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-sm">
                    <div className="text-lg font-semibold text-green-600 flex items-center">
                      <DollarSign className="h-4 w-4" />
                      {cleaner.hourly_rate}/hr
                    </div>
                    <div className="text-gray-500 text-xs">
                      {cleaner.minimum_hours}hr minimum
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link 
                      href={`/cleaner/${cleaner.id}`}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300 text-sm"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>

                {/* Contact Info */}
                {viewMode === 'list' && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {cleaner.users?.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          <span>{cleaner.users.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Responds in {cleaner.response_time_hours}h</span>
                      </div>
                    </div>
                    {cleaner.business_description && (
                      <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                        {cleaner.business_description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* No Results Message */}
        {cleaners.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No cleaners found
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or location
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link 
                href="/search"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
              >
                Try New Search
              </Link>
              <Link 
                href="/"
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition duration-300"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}