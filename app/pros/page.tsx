'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search, MapPin, Star, DollarSign, Clock, Phone, Mail,
  Filter, ChevronDown, User, Award, Shield, Calendar,
  MessageSquare, BadgeCheck, CheckCircle2, Navigation
} from 'lucide-react';

interface Professional {
  cleaner_id: string;
  business_name: string;
  business_slug: string;
  business_description: string;
  business_phone: string;
  business_email: string;
  profile_image_url: string | null;
  business_images: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  subscription_tier: string;
  service_types: string[];
  distance_miles: number;
  next_available_date: string;
  response_time_hours: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check_verified: boolean;
  instant_booking: boolean;
  trust_score: number;
  tagline: string;
  specialties: string[];
  portfolio_images: string[];
  brings_supplies: boolean;
  eco_friendly: boolean;
  pet_friendly: boolean;
}

interface SearchFilters {
  zipCode: string;
  radiusMiles: number;
  serviceTypes: string[];
  priceRange: [number, number];
  minRating: number;
  verifiedOnly: boolean;
  instantBookingOnly: boolean;
  ecoFriendlyOnly: boolean;
  petFriendlyOnly: boolean;
  bringsSuppliesOnly: boolean;
}

const SERVICE_TYPES = [
  'residential', 'deep_cleaning', 'window_cleaning', 'move_in_out',
  'post_construction', 'carpet_cleaning', 'pressure_washing', 'commercial'
];

const FLORIDA_ZIP_CODES = [
  '33101', '33102', '33109', '33139', '33140', // Miami Beach
  '33125', '33126', '33127', '33128', '33129', // Miami
  '33130', '33131', '33132', '33133', '33134', // Miami Downtown
  '32801', '32802', '32803', '32804', '32805', // Orlando
  '32806', '32807', '32808', '32809', '32810', // Orlando
  '33301', '33302', '33303', '33304', '33305', // Fort Lauderdale
  '33306', '33307', '33308', '33309', '33310', // Fort Lauderdale
];

export default function ProfessionalsPage() {
  const searchParams = useSearchParams();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    zipCode: searchParams?.get('zip') || '33101',
    radiusMiles: parseInt(searchParams?.get('radius') || '15'),
    serviceTypes: searchParams?.get('service') ? [searchParams.get('service')!] : [],
    priceRange: [0, 200],
    minRating: 0,
    verifiedOnly: false,
    instantBookingOnly: false,
    ecoFriendlyOnly: false,
    petFriendlyOnly: false,
    bringsSuppliesOnly: false,
  });

  const searchProfessionals = async () => {
    if (!filters.zipCode) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        zipCode: filters.zipCode,
        radiusMiles: filters.radiusMiles.toString(),
        ...(filters.serviceTypes.length > 0 && { serviceTypes: filters.serviceTypes.join(',') }),
        ...(filters.minRating > 0 && { minRating: filters.minRating.toString() }),
        ...(filters.priceRange[0] > 0 && { minHourlyRate: filters.priceRange[0].toString() }),
        ...(filters.priceRange[1] < 200 && { maxHourlyRate: filters.priceRange[1].toString() }),
        ...(filters.verifiedOnly && { verifiedOnly: 'true' }),
        ...(filters.instantBookingOnly && { instantBookingOnly: 'true' }),
        limit: '12'
      });

      const response = await fetch(`/api/pros/search?${params}`);
      const data = await response.json();

      if (data.success) {
        let results = data.data.results || [];

        // Apply client-side filters that aren't handled by API
        if (filters.ecoFriendlyOnly) {
          results = results.filter((p: Professional) => p.eco_friendly);
        }
        if (filters.petFriendlyOnly) {
          results = results.filter((p: Professional) => p.pet_friendly);
        }
        if (filters.bringsSuppliesOnly) {
          results = results.filter((p: Professional) => p.brings_supplies);
        }

        setProfessionals(results);
      } else {
        console.error('Search failed:', data.error);
        setProfessionals([]);
      }
    } catch (error) {
      console.error('Error searching professionals:', error);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    searchProfessionals();
  }, [filters.zipCode, filters.radiusMiles, filters.serviceTypes, filters.minRating, filters.verifiedOnly, filters.instantBookingOnly]);

  useEffect(() => {
    // Apply client-side filters
    searchProfessionals();
  }, [filters.ecoFriendlyOnly, filters.petFriendlyOnly, filters.bringsSuppliesOnly]);

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getTierBadge = (tier: string) => {
    const badges = {
      'enterprise': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Enterprise' },
      'pro': { color: 'bg-purple-100 text-purple-800 border-purple-200', text: 'Pro' },
      'basic': { color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'Basic' },
      'free': { color: 'bg-gray-100 text-gray-600 border-gray-200', text: 'Basic' }
    };
    return badges[tier as keyof typeof badges] || badges.free;
  };

  const handleViewProfile = (professional: Professional) => {
    window.location.href = `/pros/${professional.business_slug || professional.cleaner_id}`;
  };

  const handleBookNow = (professional: Professional) => {
    window.location.href = `/book/${professional.business_slug || professional.cleaner_id}?service=${filters.serviceTypes[0] || 'residential'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with CEO Cat Branding */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🐱</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Find Professional Cleaners in Florida
              </h1>
              <p className="text-sm text-gray-600 italic">
                Purrfection is our Standard
              </p>
            </div>
          </div>

          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filters.zipCode}
                onChange={(e) => handleFilterChange('zipCode', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select ZIP Code</option>
                {FLORIDA_ZIP_CODES.map(zip => (
                  <option key={zip} value={zip}>{zip}</option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filters.radiusMiles}
                onChange={(e) => handleFilterChange('radiusMiles', parseInt(e.target.value))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={5}>Within 5 miles</option>
                <option value={10}>Within 10 miles</option>
                <option value={15}>Within 15 miles</option>
                <option value={25}>Within 25 miles</option>
                <option value={50}>Within 50 miles</option>
              </select>
            </div>

            <select
              value={filters.serviceTypes[0] || ''}
              onChange={(e) => handleFilterChange('serviceTypes', e.target.value ? [e.target.value] : [])}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Services</option>
              {SERVICE_TYPES.map(service => (
                <option key={service} value={service}>
                  {service.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>

            <select
              value={filters.minRating}
              onChange={(e) => handleFilterChange('minRating', parseFloat(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={0}>Any Rating</option>
              <option value={3}>3+ Stars</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              More Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}/hour
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.priceRange[0]}
                      onChange={(e) => handleFilterChange('priceRange', [parseInt(e.target.value), filters.priceRange[1]])}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={filters.priceRange[1]}
                      onChange={(e) => handleFilterChange('priceRange', [filters.priceRange[0], parseInt(e.target.value)])}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Verification</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={(e) => handleFilterChange('verifiedOnly', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Verified Only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.instantBookingOnly}
                      onChange={(e) => handleFilterChange('instantBookingOnly', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Instant Booking</span>
                  </label>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Services</h4>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.bringsSuppliesOnly}
                      onChange={(e) => handleFilterChange('bringsSuppliesOnly', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Brings Supplies</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.ecoFriendlyOnly}
                      onChange={(e) => handleFilterChange('ecoFriendlyOnly', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Eco-Friendly</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.petFriendlyOnly}
                      onChange={(e) => handleFilterChange('petFriendlyOnly', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Pet-Friendly</span>
                  </label>
                </div>

                <div>
                  <button
                    onClick={searchProfessionals}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300 font-medium"
                  >
                    Search Professionals
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            {loading ? (
              'Searching...'
            ) : (
              <>Found {professionals.length} professional{professionals.length !== 1 ? 's' : ''} within {filters.radiusMiles} miles of {filters.zipCode}</>
            )}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Finding professionals in your area...</p>
          </div>
        ) : professionals.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No professionals found</h3>
            <p className="text-gray-600 mb-6">
              Try expanding your radius or adjusting your search criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {professionals.map((professional) => (
              <div key={professional.cleaner_id} className="bg-white rounded-lg shadow-sm border hover:shadow-lg transition-all duration-300 overflow-hidden">
                {/* Header with Distance Badge */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  {professional.business_images && professional.business_images.length > 0 ? (
                    <img
                      src={professional.business_images[0]}
                      alt={professional.business_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                      <User className="h-16 w-16 text-blue-400" />
                    </div>
                  )}

                  {/* Distance Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                      <Navigation className="h-3 w-3 inline mr-1" />
                      {professional.distance_miles} mi
                    </span>
                  </div>

                  {/* Tier Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTierBadge(professional.subscription_tier).color}`}>
                      {getTierBadge(professional.subscription_tier).text}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Business Name & Rating */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {professional.business_name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">
                        {professional.average_rating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({professional.total_reviews})
                      </span>
                    </div>
                  </div>

                  {/* Tagline */}
                  {professional.tagline && (
                    <p className="text-blue-600 text-sm font-medium mb-3 line-clamp-1">
                      {professional.tagline}
                    </p>
                  )}

                  {/* Key Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>${professional.hourly_rate}/hour ({professional.minimum_hours}hr min)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span>{professional.years_experience} years experience</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Next: {new Date(professional.next_available_date).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {professional.brings_supplies && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Brings Supplies
                      </span>
                    )}
                    {professional.eco_friendly && (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
                        Eco-Friendly
                      </span>
                    )}
                    {professional.pet_friendly && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        Pet-Friendly
                      </span>
                    )}
                    {professional.instant_booking && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                        Instant Booking
                      </span>
                    )}
                  </div>

                  {/* Verification Badges */}
                  <div className="flex items-center gap-3 mb-4">
                    {professional.insurance_verified && (
                      <div className="flex items-center gap-1 text-xs">
                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-gray-600">Insured</span>
                      </div>
                    )}
                    {professional.license_verified && (
                      <div className="flex items-center gap-1 text-xs">
                        <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-gray-600">Licensed</span>
                      </div>
                    )}
                    {professional.background_check_verified && (
                      <div className="flex items-center gap-1 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-gray-600">Background Check</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewProfile(professional)}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition duration-300 text-sm font-medium"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleBookNow(professional)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300 text-sm font-medium"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}