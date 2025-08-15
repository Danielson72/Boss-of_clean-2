'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  Search, MapPin, Star, DollarSign, Clock, Phone, Mail,
  Filter, ChevronDown, User, Award, Shield, Calendar,
  MessageSquare
} from 'lucide-react';

interface Cleaner {
  id: string;
  business_name: string;
  business_description: string;
  business_phone: string;
  business_email: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  average_rating: number;
  total_reviews: number;
  profile_photos: string[];
  insurance_verified: boolean;
  license_verified: boolean;
  subscription_tier: string;
  created_at: string;
}

const SERVICE_TYPES = [
  'House Cleaning', 'Deep Cleaning', 'Move-in/Move-out Cleaning',
  'Post-Construction Cleaning', 'Office Cleaning', 'Carpet Cleaning',
  'Window Cleaning', 'Pressure Washing', 'Organizing Services',
  'Laundry Services', 'Pet-Friendly Cleaning', 'Green/Eco Cleaning'
];

const FLORIDA_ZIP_CODES = [
  '32801', '33101', '33602', '32202', '33301', '32301',
  '33701', '32501', '32601', '34102', '33480', '32114',
  '34102', '33901', '33601', '32751', '33063', '33143',
  '33410', '32789'
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [filteredCleaners, setFilteredCleaners] = useState<Cleaner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams?.get('location') || '');
  const [selectedService, setSelectedService] = useState(searchParams?.get('service') || '');
  const [selectedZip, setSelectedZip] = useState(searchParams?.get('zip') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [experienceMin, setExperienceMin] = useState(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadCleaners();
  }, []);

  useEffect(() => {
    filterCleaners();
  }, [cleaners, searchTerm, selectedService, selectedZip, priceRange, experienceMin, verifiedOnly]);

  const loadCleaners = async () => {
    try {
      const { data, error } = await supabase
        .from('cleaners')
        .select('*')
        .eq('approval_status', 'approved')
        .order('subscription_tier', { ascending: false })
        .order('average_rating', { ascending: false });

      if (error) throw error;
      setCleaners(data || []);
    } catch (error) {
      console.error('Error loading cleaners:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCleaners = () => {
    let filtered = cleaners;

    // Filter by location (ZIP code or city search)
    if (searchTerm || selectedZip) {
      filtered = filtered.filter(cleaner => {
        const searchValue = selectedZip || searchTerm;
        return cleaner.service_areas.some(area => 
          area.includes(searchValue.toLowerCase()) ||
          area.toLowerCase().includes(searchValue.toLowerCase())
        );
      });
    }

    // Filter by service type
    if (selectedService) {
      filtered = filtered.filter(cleaner => 
        cleaner.services.includes(selectedService)
      );
    }

    // Filter by price range
    filtered = filtered.filter(cleaner => 
      cleaner.hourly_rate >= priceRange[0] && cleaner.hourly_rate <= priceRange[1]
    );

    // Filter by minimum experience
    if (experienceMin > 0) {
      filtered = filtered.filter(cleaner => 
        cleaner.years_experience >= experienceMin
      );
    }

    // Filter by verification status
    if (verifiedOnly) {
      filtered = filtered.filter(cleaner => 
        cleaner.insurance_verified && cleaner.license_verified
      );
    }

    setFilteredCleaners(filtered);
  };

  const handleRequestQuote = (cleanerId: string) => {
    // Navigate to quote request page with cleaner ID
    window.location.href = `/quote-request?cleaner=${cleanerId}&service=${selectedService}&zip=${selectedZip}`;
  };

  const getTierBadge = (tier: string) => {
    const badges = {
      'enterprise': { color: 'bg-yellow-100 text-yellow-800', text: 'Enterprise' },
      'pro': { color: 'bg-purple-100 text-purple-800', text: 'Pro' },
      'basic': { color: 'bg-blue-100 text-blue-800', text: 'Basic' },
      'free': { color: 'bg-gray-100 text-gray-800', text: 'Basic' }
    };
    return badges[tier as keyof typeof badges] || badges.free;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Finding cleaners in your area...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Find Professional Cleaners in Florida
          </h1>
          
          {/* Search Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Enter ZIP code or city"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={selectedZip}
              onChange={(e) => setSelectedZip(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select ZIP Code</option>
              {FLORIDA_ZIP_CODES.map(zip => (
                <option key={zip} value={zip}>{zip}</option>
              ))}
            </select>
            
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Services</option>
              {SERVICE_TYPES.map(service => (
                <option key={service} value={service}>{service}</option>
              ))}
            </select>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range: ${priceRange[0]} - ${priceRange[1]}/hour
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Experience
                  </label>
                  <select
                    value={experienceMin}
                    onChange={(e) => setExperienceMin(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value={0}>Any Experience</option>
                    <option value={1}>1+ Years</option>
                    <option value={3}>3+ Years</option>
                    <option value={5}>5+ Years</option>
                    <option value={10}>10+ Years</option>
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                      className="mr-2"
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

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Found {filteredCleaners.length} cleaner{filteredCleaners.length !== 1 ? 's' : ''} in your area
          </p>
        </div>

        {filteredCleaners.length === 0 ? (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cleaners found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or expanding your location area.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCleaners.map((cleaner) => (
              <div key={cleaner.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-300">
                {/* Profile Photo */}
                <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
                  {cleaner.profile_photos.length > 0 ? (
                    <img
                      src={cleaner.profile_photos[0]}
                      alt={cleaner.business_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Tier Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierBadge(cleaner.subscription_tier).color}`}>
                      {getTierBadge(cleaner.subscription_tier).text}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Business Name & Rating */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {cleaner.business_name}
                    </h3>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-sm font-medium">
                        {cleaner.average_rating.toFixed(1)}
                      </span>
                      <span className="text-sm text-gray-600">
                        ({cleaner.total_reviews})
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {cleaner.business_description}
                  </p>

                  {/* Key Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>${cleaner.hourly_rate}/hour ({cleaner.minimum_hours}hr min)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span>{cleaner.years_experience} years experience</span>
                    </div>
                    {(cleaner.insurance_verified || cleaner.license_verified) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Shield className="h-4 w-4 text-green-500" />
                        <span className="text-green-600">
                          {cleaner.insurance_verified && cleaner.license_verified 
                            ? 'Fully Verified' 
                            : 'Partially Verified'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                      {cleaner.services.slice(0, 3).map((service, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {service}
                        </span>
                      ))}
                      {cleaner.services.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{cleaner.services.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRequestQuote(cleaner.id)}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Request Quote
                    </button>
                    <a
                      href={`tel:${cleaner.business_phone}`}
                      className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition duration-300"
                    >
                      <Phone className="h-4 w-4 text-gray-600" />
                    </a>
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