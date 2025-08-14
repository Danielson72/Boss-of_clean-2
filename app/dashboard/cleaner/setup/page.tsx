'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  Building2, Phone, Mail, Globe, DollarSign, Clock, 
  MapPin, CheckCircle, AlertCircle, Info
} from 'lucide-react';

const serviceTypes = [
  { value: 'residential', label: 'Residential Cleaning' },
  { value: 'commercial', label: 'Commercial Cleaning' },
  { value: 'deep_cleaning', label: 'Deep Cleaning' },
  { value: 'pressure_washing', label: 'Pressure Washing' },
  { value: 'window_cleaning', label: 'Window Cleaning' },
  { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
  { value: 'move_in_out', label: 'Move-In/Out Cleaning' },
  { value: 'post_construction', label: 'Post-Construction Cleanup' }
];

const popularZipCodes = [
  '33109', '33139', '33140', // Miami Beach
  '32801', '32803', '32804', // Orlando
  '33602', '33606', '33609', // Tampa
  '32204', '32207', '32210', // Jacksonville
  '33301', '33304', '33308', // Fort Lauderdale
];

export default function CleanerSetupPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    business_name: '',
    business_description: '',
    business_phone: '',
    business_email: '',
    website_url: '',
    services: [] as string[],
    service_areas: [] as string[],
    hourly_rate: '',
    minimum_hours: '2',
    years_experience: '',
    employees_count: '1',
    insurance_verified: false,
    license_number: '',
    instant_booking: false,
  });

  const [customZipCode, setCustomZipCode] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleServiceToggle = (service: string) => {
    setFormData({
      ...formData,
      services: formData.services.includes(service)
        ? formData.services.filter(s => s !== service)
        : [...formData.services, service]
    });
  };

  const handleZipCodeToggle = (zipCode: string) => {
    setFormData({
      ...formData,
      service_areas: formData.service_areas.includes(zipCode)
        ? formData.service_areas.filter(z => z !== zipCode)
        : [...formData.service_areas, zipCode]
    });
  };

  const addCustomZipCode = () => {
    if (customZipCode && /^\d{5}$/.test(customZipCode)) {
      if (!formData.service_areas.includes(customZipCode)) {
        setFormData({
          ...formData,
          service_areas: [...formData.service_areas, customZipCode]
        });
      }
      setCustomZipCode('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.business_name || !formData.business_phone || !formData.business_email) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (formData.services.length === 0) {
      setError('Please select at least one service');
      return;
    }
    
    if (formData.service_areas.length === 0) {
      setError('Please select at least one service area');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { error } = await supabase
        .from('cleaners')
        .insert({
          user_id: user?.id,
          business_name: formData.business_name,
          business_description: formData.business_description,
          business_phone: formData.business_phone,
          business_email: formData.business_email,
          website_url: formData.website_url || null,
          services: formData.services,
          service_areas: formData.service_areas,
          hourly_rate: parseFloat(formData.hourly_rate) || 50,
          minimum_hours: parseInt(formData.minimum_hours) || 2,
          years_experience: parseInt(formData.years_experience) || 0,
          employees_count: parseInt(formData.employees_count) || 1,
          insurance_verified: formData.insurance_verified,
          license_number: formData.license_number || null,
          instant_booking: formData.instant_booking,
          approval_status: 'pending'
        });

      if (error) throw error;

      setSuccess('Profile created successfully! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/dashboard/cleaner');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Set Up Your Cleaning Business Profile
              </h1>
              <p className="text-gray-600">
                Complete your profile to start receiving quote requests
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-700">{success}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Business Information */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        name="business_name"
                        value={formData.business_name}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="tel"
                        name="business_phone"
                        value={formData.business_phone}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="email"
                        name="business_email"
                        value={formData.business_email}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website (Optional)
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="url"
                        name="website_url"
                        value={formData.website_url}
                        onChange={handleChange}
                        placeholder="https://www.example.com"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description
                  </label>
                  <textarea
                    name="business_description"
                    value={formData.business_description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Tell customers about your business, experience, and what makes you unique..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Services */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Services Offered *</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {serviceTypes.map((service) => (
                    <label key={service.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service.value)}
                        onChange={() => handleServiceToggle(service.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-gray-700">{service.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Service Areas */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Areas (ZIP Codes) *</h2>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">Select popular ZIP codes or add your own:</p>
                  <div className="flex flex-wrap gap-2">
                    {popularZipCodes.map((zip) => (
                      <button
                        key={zip}
                        type="button"
                        onClick={() => handleZipCodeToggle(zip)}
                        className={`px-3 py-1 rounded-full text-sm transition duration-300 ${
                          formData.service_areas.includes(zip)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {zip}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customZipCode}
                    onChange={(e) => setCustomZipCode(e.target.value)}
                    placeholder="Add custom ZIP code"
                    maxLength={5}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addCustomZipCode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300"
                  >
                    Add
                  </button>
                </div>

                {formData.service_areas.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Selected areas:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.service_areas.map((zip) => (
                        <span key={zip} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {zip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing & Experience */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing & Experience</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hourly Rate ($)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        name="hourly_rate"
                        value={formData.hourly_rate}
                        onChange={handleChange}
                        placeholder="50"
                        min="0"
                        step="5"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Hours
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        name="minimum_hours"
                        value={formData.minimum_hours}
                        onChange={handleChange}
                        min="1"
                        max="8"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      name="years_experience"
                      value={formData.years_experience}
                      onChange={handleChange}
                      min="0"
                      placeholder="5"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Employees
                    </label>
                    <input
                      type="number"
                      name="employees_count"
                      value={formData.employees_count}
                      onChange={handleChange}
                      min="1"
                      placeholder="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Options</h2>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="insurance_verified"
                      checked={formData.insurance_verified}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-gray-700">I have liability insurance</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="instant_booking"
                      checked={formData.instant_booking}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-gray-700">Enable instant booking</span>
                  </label>
                </div>

                {formData.insurance_verified && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      License Number (Optional)
                    </label>
                    <input
                      type="text"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-semibold mb-1">What happens next?</p>
                    <p>After submitting, your profile will be reviewed by our team. Once approved, you'll start appearing in search results and can receive quote requests from customers.</p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Profile...' : 'Create Business Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}