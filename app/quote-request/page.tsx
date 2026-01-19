'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  CheckCircle,
  ArrowLeft,
  Home,
  Building2,
  Sparkles,
  Phone,
  Mail,
  User,
  Square,
  Bath,
  Bed,
} from 'lucide-react';
import Link from 'next/link';
import { submitQuoteRequest, type QuoteRequestData } from './actions';

const SERVICE_TYPES = [
  { value: 'residential', label: 'Residential Cleaning', icon: Home },
  { value: 'commercial', label: 'Commercial Cleaning', icon: Building2 },
  { value: 'deep_cleaning', label: 'Deep Cleaning', icon: Sparkles },
  { value: 'move_in_out', label: 'Move In/Out Cleaning', icon: Home },
  { value: 'recurring', label: 'Recurring Service', icon: Calendar },
];

const PROPERTY_TYPES = [
  { value: 'home', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];

export default function QuoteRequestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<QuoteRequestData>({
    service_type: searchParams?.get('service') || '',
    property_type: 'home',
    sqft_estimate: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    zip_code: searchParams?.get('zip') || '',
    city: '',
    preferred_date: '',
    flexibility: 'flexible',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
  });

  const handleInputChange = (
    field: keyof QuoteRequestData,
    value: string | number | undefined
  ) => {
    setFormData({ ...formData, [field]: value });
    setError(null);
  };

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        if (!formData.service_type) {
          setError('Please select a service type');
          return false;
        }
        if (!formData.zip_code || !/^\d{5}(-\d{4})?$/.test(formData.zip_code)) {
          setError('Please enter a valid ZIP code');
          return false;
        }
        return true;
      case 2:
        return true; // Property details are optional
      case 3:
        if (!formData.contact_name) {
          setError('Please enter your name');
          return false;
        }
        if (!formData.contact_email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(formData.contact_email)) {
          setError('Please enter a valid email address');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitQuoteRequest(formData);

      if (result.success) {
        setSubmitted(true);
        setMatchCount(result.matchCount || 0);
        setQuoteId(result.quoteId || null);
      } else {
        setError(result.error || 'Failed to submit quote request');
      }
    } catch (err) {
      console.error('Error submitting quote:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quote Request Sent!
          </h2>
          <p className="text-gray-600 mb-6">
            {matchCount > 0 ? (
              <>
                We&apos;ve matched your request with <strong>{matchCount} cleaning professionals</strong> in your area.
                You&apos;ll receive quotes within 24-48 hours.
              </>
            ) : (
              <>
                Your request has been submitted. We&apos;re working to find cleaners in your area.
                Check back soon for quotes.
              </>
            )}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Cleaners review your request</li>
              <li>✓ You receive quotes via email</li>
              <li>✓ Compare and choose the best offer</li>
              <li>✓ Book directly with your chosen cleaner</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Link
              href="/search"
              className="block w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition duration-300 font-medium"
            >
              Browse More Cleaners
            </Link>
            <Link
              href="/"
              className="block w-full text-blue-600 hover:text-blue-700 font-medium"
            >
              Return to Home
            </Link>
          </div>

          {quoteId && (
            <p className="text-xs text-gray-500 mt-4">
              Reference ID: {quoteId.slice(0, 8)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link href="/search" className="text-gray-600 hover:text-gray-900 mr-4">
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Get Free Quotes</h1>
              <p className="text-sm text-gray-600">
                Compare quotes from verified cleaners in your area
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                    s < step
                      ? 'bg-green-500 text-white'
                      : s === step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s < step ? <CheckCircle className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-24 sm:w-32 h-1 mx-2 ${
                      s < step ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Service</span>
            <span>Property</span>
            <span>Contact</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Service Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    What type of cleaning do you need?
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SERVICE_TYPES.map((service) => {
                      const Icon = service.icon;
                      return (
                        <button
                          key={service.value}
                          type="button"
                          onClick={() => handleInputChange('service_type', service.value)}
                          className={`flex items-center gap-3 p-4 border rounded-lg text-left transition ${
                            formData.service_type === service.value
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className={`h-5 w-5 ${
                            formData.service_type === service.value
                              ? 'text-blue-600'
                              : 'text-gray-400'
                          }`} />
                          <span className="font-medium">{service.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your ZIP Code *
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.zip_code}
                      onChange={(e) => handleInputChange('zip_code', e.target.value)}
                      placeholder="32801"
                      maxLength={10}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Orlando"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferred Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="date"
                      value={formData.preferred_date}
                      onChange={(e) => handleInputChange('preferred_date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduling Flexibility
                  </label>
                  <div className="flex gap-3">
                    {[
                      { value: 'exact', label: 'Exact date only' },
                      { value: 'flexible', label: 'Flexible' },
                      { value: 'asap', label: 'ASAP' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleInputChange('flexibility', option.value)}
                        className={`flex-1 py-2 px-3 border rounded-lg text-sm font-medium transition ${
                          formData.flexibility === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Property Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Tell us about your property
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {PROPERTY_TYPES.map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => handleInputChange('property_type', type.value as QuoteRequestData['property_type'])}
                            className={`py-2 px-3 border rounded-lg text-sm font-medium transition ${
                              formData.property_type === type.value
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bedrooms
                        </label>
                        <div className="relative">
                          <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <select
                            value={formData.bedrooms || ''}
                            onChange={(e) => handleInputChange('bedrooms', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                          >
                            <option value="">Select</option>
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                            <option value="7">7+</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Bathrooms
                        </label>
                        <div className="relative">
                          <Bath className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <select
                            value={formData.bathrooms || ''}
                            onChange={(e) => handleInputChange('bathrooms', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                          >
                            <option value="">Select</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                            <option value="6">6+</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Approximate Square Footage
                      </label>
                      <div className="relative">
                        <Square className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <select
                          value={formData.sqft_estimate || ''}
                          onChange={(e) => handleInputChange('sqft_estimate', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                        >
                          <option value="">Select</option>
                          <option value="500">Under 500 sq ft</option>
                          <option value="1000">500-1,000 sq ft</option>
                          <option value="1500">1,000-1,500 sq ft</option>
                          <option value="2000">1,500-2,000 sq ft</option>
                          <option value="2500">2,000-2,500 sq ft</option>
                          <option value="3000">2,500-3,000 sq ft</option>
                          <option value="4000">3,000-4,000 sq ft</option>
                          <option value="5000">4,000+ sq ft</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Details
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        placeholder="Any special requirements, access instructions, or specific areas that need attention..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact Information */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    How can cleaners reach you?
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Your Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.contact_name}
                          onChange={(e) => handleInputChange('contact_name', e.target.value)}
                          placeholder="John Smith"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.contact_email}
                          onChange={(e) => handleInputChange('contact_email', e.target.value)}
                          placeholder="john@example.com"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.contact_phone}
                          onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                          placeholder="(555) 123-4567"
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Your Quote Request Summary</h4>
                    <dl className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Service:</dt>
                        <dd className="font-medium">{SERVICE_TYPES.find(s => s.value === formData.service_type)?.label || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Location:</dt>
                        <dd className="font-medium">{formData.city ? `${formData.city}, ` : ''}{formData.zip_code}</dd>
                      </div>
                      {formData.preferred_date && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Date:</dt>
                          <dd className="font-medium">{new Date(formData.preferred_date + 'T00:00:00').toLocaleDateString()}</dd>
                        </div>
                      )}
                      {formData.bedrooms && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Bedrooms:</dt>
                          <dd className="font-medium">{formData.bedrooms}</dd>
                        </div>
                      )}
                      {formData.bathrooms && (
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Bathrooms:</dt>
                          <dd className="font-medium">{formData.bathrooms}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <p className="text-xs text-gray-500 mt-4">
                    By submitting, you agree to receive quotes from verified cleaning professionals.
                    Your information is protected and never shared publicly.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 transition"
                >
                  {submitting ? 'Submitting...' : 'Get Free Quotes'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Free quotes
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              No obligation
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Verified cleaners
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
