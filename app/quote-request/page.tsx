'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { 
  Calendar, MapPin, DollarSign, MessageSquare, 
  CheckCircle, ArrowLeft, User, Phone, Mail,
  Star, Shield, Award
} from 'lucide-react';
import Link from 'next/link';

interface Cleaner {
  id: string;
  business_name: string;
  business_description: string;
  business_phone: string;
  business_email: string;
  services: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  average_rating: number;
  total_reviews: number;
  profile_photos: string[];
  insurance_verified: boolean;
  license_verified: boolean;
}

export default function QuoteRequestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [cleaner, setCleaner] = useState<Cleaner | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    service_type: searchParams?.get('service') || '',
    service_date: '',
    service_time: '',
    address: '',
    city: '',
    zip_code: searchParams?.get('zip') || '',
    description: '',
    estimated_hours: 2
  });
  
  const cleanerId = searchParams?.get('cleaner');
  const supabase = createClient();

  useEffect(() => {
    if (cleanerId) {
      loadCleaner();
    } else {
      setLoading(false);
    }
  }, [cleanerId]);

  const loadCleaner = async () => {
    try {
      const { data, error } = await supabase
        .from('cleaners')
        .select('*')
        .eq('id', cleanerId)
        .single();

      if (error) throw error;
      setCleaner(data);
    } catch (error) {
      console.error('Error loading cleaner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (!cleanerId) {
      alert('Please select a cleaner first');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('quote_requests')
        .insert({
          customer_id: user.id,
          cleaner_id: cleanerId,
          service_type: formData.service_type,
          service_date: formData.service_date,
          service_time: formData.service_time,
          address: formData.address,
          city: formData.city,
          zip_code: formData.zip_code,
          description: formData.description,
          estimated_hours: formData.estimated_hours,
          status: 'pending'
        });

      if (error) throw error;
      
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting quote request:', error);
      alert('Error submitting quote request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cleaner information...</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Quote Request Sent!
          </h2>
          <p className="text-gray-600 mb-6">
            Your quote request has been sent to {cleaner?.business_name}. 
            You'll receive a response within 24 hours.
          </p>
          <div className="space-y-3">
            <Link
              href="/dashboard/customer"
              className="block w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-300"
            >
              View My Quotes
            </Link>
            <Link
              href="/search"
              className="block w-full text-blue-600 hover:text-blue-700 font-medium"
            >
              Find More Cleaners
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!cleanerId || !cleaner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            No Cleaner Selected
          </h2>
          <p className="text-gray-600 mb-6">
            Please select a cleaner from the search results to request a quote.
          </p>
          <Link
            href="/search"
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-300"
          >
            Find Cleaners
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link
              href="/search"
              className="text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Request a Quote
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cleaner Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-8">
              {/* Profile Photo */}
              <div className="h-32 bg-gray-200 rounded-lg overflow-hidden mb-4">
                {cleaner.profile_photos.length > 0 ? (
                  <img
                    src={cleaner.profile_photos[0]}
                    alt={cleaner.business_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Business Info */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {cleaner.business_name}
              </h3>
              
              <div className="flex items-center gap-1 mb-3">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">
                  {cleaner.average_rating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-600">
                  ({cleaner.total_reviews} reviews)
                </span>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {cleaner.business_description}
              </p>

              {/* Key Details */}
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

              {/* Contact Info */}
              <div className="pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${cleaner.business_phone}`} className="text-blue-600 hover:text-blue-700">
                      {cleaner.business_phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a href={`mailto:${cleaner.business_email}`} className="text-blue-600 hover:text-blue-700">
                      {cleaner.business_email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote Request Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Tell us about your cleaning needs
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Service Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Service Type *
                      </label>
                      <select
                        value={formData.service_type}
                        onChange={(e) => handleInputChange('service_type', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select service</option>
                        {cleaner.services.map((service) => (
                          <option key={service} value={service}>{service}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Hours
                      </label>
                      <select
                        value={formData.estimated_hours}
                        onChange={(e) => handleInputChange('estimated_hours', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={2}>2 hours</option>
                        <option value={3}>3 hours</option>
                        <option value={4}>4 hours</option>
                        <option value={6}>6 hours</option>
                        <option value={8}>8 hours</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">When do you need service?</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Date *
                      </label>
                      <input
                        type="date"
                        value={formData.service_date}
                        onChange={(e) => handleInputChange('service_date', e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Time *
                      </label>
                      <select
                        value={formData.service_time}
                        onChange={(e) => handleInputChange('service_time', e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select time</option>
                        <option value="08:00">8:00 AM</option>
                        <option value="09:00">9:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Service Location</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="123 Main Street"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="Orlando"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          value={formData.zip_code}
                          onChange={(e) => handleInputChange('zip_code', e.target.value)}
                          placeholder="32801"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Details
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    placeholder="Please describe any specific requirements, access instructions, or special considerations..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Estimated Cost */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Estimated Cost</h4>
                  <div className="text-sm text-gray-600">
                    <p>Base rate: ${cleaner.hourly_rate}/hour × {formData.estimated_hours} hours = ${cleaner.hourly_rate * formData.estimated_hours}</p>
                    <p className="text-xs mt-1">* Final price may vary based on actual service requirements</p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition duration-300 font-medium"
                  >
                    {submitting ? 'Sending Request...' : 'Send Quote Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}