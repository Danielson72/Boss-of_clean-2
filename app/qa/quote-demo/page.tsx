'use client';

import { useState } from 'react';
import { submitQuote, isCustomerLimitError, isCleanerCapacityError, isQuoteSuccess, QuoteResponse, validateQuotePayload } from '@/lib/quoteClient';
import GuestLimitModal from '@/components/modals/GuestLimitModal';
import CleanerCapacityModal from '@/components/modals/CleanerCapacityModal';
import { Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuoteDemoPage() {
  const [response, setResponse] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showGuestLimit, setShowGuestLimit] = useState(false);
  const [showCleanerCap, setShowCleanerCap] = useState(false);

  // Form state
  const [cleanerId, setCleanerId] = useState('c65ce362-ba2e-43ff-9966-eaa2f68a8444'); // default test cleaner
  const [serviceType, setServiceType] = useState('residential');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [zipCode, setZipCode] = useState('33101');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);
    setShowGuestLimit(false);
    setShowCleanerCap(false);

    // Build payload with explicit field mapping
    const payload = {
      cleaner_id: cleanerId,
      service_type: serviceType,
      zip_code: zipCode || '',
      description: description || '',
      customer_name: null,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      service_date: null,
      service_time: null,
      property_type: null,
      property_size: null,
      frequency: null,
      duration_hours: null,
    };

    // Validate required fields
    const validationError = validateQuotePayload(payload);
    if (validationError) {
      toast.error(validationError);
      setLoading(false);
      return;
    }

    const loadingToast = toast.loading('Sending quote request...');

    const result = await submitQuote(payload);

    setResponse(result);
    setLoading(false);
    toast.dismiss(loadingToast);

    // Show appropriate toasts
    if (isQuoteSuccess(result)) {
      toast.success('Quote request sent successfully!');
    } else if (isCustomerLimitError(result)) {
      toast.error('Please sign up for unlimited quotes');
      setShowGuestLimit(true);
    } else if (isCleanerCapacityError(result)) {
      toast.error('This cleaner is at capacity');
      setShowCleanerCap(true);
    } else if ('error' in result) {
      toast.error('message' in result ? String(result.message) : 'Something went wrong');
    }
  };

  const getStatusBadge = () => {
    if (!response) return null;

    if (isQuoteSuccess(response)) {
      return (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <div className="font-medium text-green-900">Quote Created Successfully!</div>
            <div className="text-sm text-green-700">Quote ID: {response.quoteId}</div>
          </div>
        </div>
      );
    }

    if ('error' in response) {
      const errorType = response.error;
      let icon = <XCircle className="w-5 h-5 text-red-600" />;
      let bgColor = 'bg-red-50';
      let borderColor = 'border-red-200';
      let textColor = 'text-red-900';

      if (errorType === 'customer_limit_reached') {
        icon = <AlertCircle className="w-5 h-5 text-orange-600" />;
        bgColor = 'bg-orange-50';
        borderColor = 'border-orange-200';
        textColor = 'text-orange-900';
      } else if (errorType === 'cleaner_at_monthly_cap') {
        icon = <AlertCircle className="w-5 h-5 text-amber-600" />;
        bgColor = 'bg-amber-50';
        borderColor = 'border-amber-200';
        textColor = 'text-amber-900';
      }

      return (
        <div className={`flex items-start gap-2 p-4 ${bgColor} border ${borderColor} rounded-lg`}>
          {icon}
          <div className="flex-1">
            <div className={`font-medium ${textColor}`}>{errorType}</div>
            <div className="text-sm text-gray-700 mt-1">
              <pre className="whitespace-pre-wrap font-mono text-xs">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quote Request QA Demo
          </h1>
          <p className="text-gray-600">
            Internal testing page for POST /api/quote orchestration, rate limits, and modals.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Submit Quote Request
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cleaner ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cleanerId}
                  onChange={(e) => setCleanerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default test cleaner UUID
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="residential">Residential</option>
                  <option value="deep_cleaning">Deep Cleaning</option>
                  <option value="commercial">Commercial</option>
                  <option value="pressure_washing">Pressure Washing</option>
                  <option value="window_cleaning">Window Cleaning</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="407-461-6039"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="33101"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description / Notes
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="2BR apartment, deep clean needed..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Quote Request
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Response Display */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                API Response
              </h2>

              {!response && (
                <div className="text-center py-8 text-gray-400">
                  Submit a quote request to see the response
                </div>
              )}

              {response && getStatusBadge()}
            </div>

            {/* Test Scenarios */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Test Scenarios
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <div>
                    <strong>Guest Daily Limit:</strong> Submit 4+ requests as guest (no auth) to trigger 429 daily limit
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <div>
                    <strong>Guest Monthly Limit:</strong> Submit 11+ requests over time to trigger 429 monthly limit
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <div>
                    <strong>Cleaner Cap:</strong> Choose a cleaner at tier limit to trigger 403 capacity error
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold mt-0.5">•</span>
                  <div>
                    <strong>Success:</strong> Normal request should return 201 with quoteId
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Triggers */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Manual Modal Testing
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGuestLimit(true)}
                  className="flex-1 px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                >
                  Guest Limit Modal
                </button>
                <button
                  onClick={() => setShowCleanerCap(true)}
                  className="flex-1 px-4 py-2 text-sm bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors"
                >
                  Cleaner Cap Modal
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {response && isCustomerLimitError(response) && (
        <GuestLimitModal
          isOpen={showGuestLimit}
          onClose={() => setShowGuestLimit(false)}
          limitData={response}
        />
      )}

      {response && isCleanerCapacityError(response) && (
        <CleanerCapacityModal
          isOpen={showCleanerCap}
          onClose={() => setShowCleanerCap(false)}
          errorData={response}
          cleanerName="Test Cleaning Service"
        />
      )}
    </div>
  );
}
