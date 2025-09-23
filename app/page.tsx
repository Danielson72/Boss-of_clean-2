'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Star, CheckCircle, Users, Clock, Shield, Home, Building2, Droplets, Sparkles, Wind, Brush, BadgeCheck, DollarSign } from 'lucide-react';

export default function HomePage() {
  const [serviceType, setServiceType] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  
  // Quote form fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [serviceTime, setServiceTime] = useState('');
  const [durationHours, setDurationHours] = useState('2');
  const [propertyType, setPropertyType] = useState('');
  const [propertySize, setPropertySize] = useState('');
  const [frequency, setFrequency] = useState('one-time');
  const [description, setDescription] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  
  const router = useRouter();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (serviceType) params.set('service', serviceType);
    if (zipCode) params.set('zip', zipCode);
    
    router.push(`/search?${params.toString()}`);
  };

  const handleQuoteRequest = () => {
    if (!serviceType || !zipCode) {
      setSubmitError('Please select a service type and enter your ZIP code first.');
      return;
    }
    setShowQuoteForm(true);
    setSubmitError('');
  };

  const submitQuoteRequest = async () => {
    if (!customerName || !customerEmail || !customerPhone || !address || !city) {
      setSubmitError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');

    try {
      const response = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service_type: serviceType,
          zip_code: zipCode,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          address,
          city,
          service_date: serviceDate || null,
          service_time: serviceTime || null,
          duration_hours: parseInt(durationHours),
          property_type: propertyType,
          property_size: propertySize,
          frequency,
          description,
          special_requests: specialRequests
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage(data.message);
        setShowQuoteForm(false);
        // Reset form
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setAddress('');
        setCity('');
        setServiceDate('');
        setServiceTime('');
        setDescription('');
        setSpecialRequests('');
      } else {
        setSubmitError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting quote request:', error);
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleListBusiness = () => {
    router.push('/signup');
  };

  const services = [
    { icon: Home, name: 'Residential Cleaning', description: 'House cleaning, apartments, condos' },
    { icon: Building2, name: 'Commercial Cleaning', description: 'Offices, retail, industrial spaces' },
    { icon: Sparkles, name: 'Deep Cleaning', description: 'Move-in/out, post-construction' },
    { icon: Droplets, name: 'Pressure Washing', description: 'Driveways, patios, building exteriors' },
    { icon: Wind, name: 'Window Cleaning', description: 'Residential and commercial windows' },
    { icon: Brush, name: 'Carpet Cleaning', description: 'Professional carpet and upholstery' },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      location: 'Orlando, FL',
      rating: 5,
      text: 'Found an amazing cleaning service through Boss of Clean. They were professional, thorough, and reasonably priced!'
    },
    {
      name: 'Mike Rodriguez',
      location: 'Miami, FL', 
      rating: 5,
      text: 'As a business owner, I needed reliable commercial cleaning. Boss of Clean connected me with the perfect team.'
    },
    {
      name: 'Jennifer Smith',
      location: 'Tampa, FL',
      rating: 5,
      text: 'The search process was so easy! Within minutes I had quotes from multiple qualified cleaners in my area.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col">
        {/* Hero Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/ceo-cat-hero.png')",
            backgroundPosition: 'center 30%',
            backgroundSize: 'cover'
          }}
        />
        
        {/* Content Container */}
        <div className="relative flex-1 flex flex-col justify-end">
          {/* Upper section - Ensure CEO cat is visible on mobile */}
          <div className="flex-1 min-h-[50vh] sm:min-h-[55vh] md:min-h-[60vh]"></div>
          
          {/* Lower section - Text and Search Form with adjusted gradient */}
          <div className="bg-gradient-to-t from-white via-white/95 to-transparent backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
              <div className="text-center">
                {/* Main Headlines */}
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 mb-2 sm:mb-4 tracking-tight">
                  <span className="text-blue-600">BOSS</span> <span className="text-gray-900">OF</span> <span className="text-blue-600">CLEAN</span>
                </h1>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-1 sm:mb-2">
                  Florida's #1 Cleaning Directory
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-4 sm:mb-6 md:mb-8 font-medium">
                  Find Any Cleaner in <span className="text-blue-600 font-bold">60 Seconds</span>
                </p>
                
                {/* Search Form */}
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          What service do you need?
                        </label>
                        <select 
                          value={serviceType}
                          onChange={(e) => setServiceType(e.target.value)}
                          className="w-full p-4 border-2 border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                        >
                          <option value="">Select a service</option>
                          <option value="House Cleaning">House Cleaning</option>
                          <option value="Deep Cleaning">Deep Cleaning</option>
                          <option value="Move-in/Move-out Cleaning">Move-in/Move-out Cleaning</option>
                          <option value="Post-Construction Cleaning">Post-Construction Cleaning</option>
                          <option value="Office Cleaning">Office Cleaning</option>
                          <option value="Carpet Cleaning">Carpet Cleaning</option>
                          <option value="Window Cleaning">Window Cleaning</option>
                          <option value="Pressure Washing">Pressure Washing</option>
                          <option value="Organizing Services">Organizing Services</option>
                          <option value="Laundry Services">Laundry Services</option>
                          <option value="Pet-Friendly Cleaning">Pet-Friendly Cleaning</option>
                          <option value="Green/Eco Cleaning">Green/Eco Cleaning</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Your ZIP Code
                        </label>
                        <input
                          type="text"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          placeholder="Enter ZIP code"
                          className="w-full p-4 border-2 border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                        />
                      </div>
                    </div>
                    
                    {/* Success/Error Messages */}
                    {submitMessage && (
                      <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-xl">
                        {submitMessage}
                      </div>
                    )}
                    {submitError && (
                      <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                        {submitError}
                      </div>
                    )}

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={handleSearch}
                        disabled={!serviceType || !zipCode}
                        className="flex-1 sm:flex-none bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[60px] flex items-center justify-center"
                      >
                        <Search className="h-6 w-6 mr-3" />
                        Find a Cleaner Now
                      </button>
                      <button 
                        onClick={handleQuoteRequest}
                        className="flex-1 sm:flex-none bg-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[60px] flex items-center justify-center"
                      >
                        <DollarSign className="h-6 w-6 mr-3" />
                        Request Quote
                      </button>
                      <button 
                        onClick={handleListBusiness}
                        className="flex-1 sm:flex-none bg-green-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[60px] flex items-center justify-center"
                      >
                        List Your Business
                      </button>
                    </div>
                    
                    {/* Trust Indicators */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                          <span className="font-medium">500+ Verified Cleaners</span>
                        </div>
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-blue-500 mr-2" />
                          <span className="font-medium">Licensed & Insured</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                          <span className="font-medium">Available 24/7</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Request Form Modal */}
      {showQuoteForm && (
        <section className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Request a Quote</h2>
                <button 
                  onClick={() => setShowQuoteForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Location</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Service Type
                        </label>
                        <input
                          type="text"
                          value={serviceType}
                          className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Service Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Details</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Date
                        </label>
                        <input
                          type="date"
                          value={serviceDate}
                          onChange={(e) => setServiceDate(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Preferred Time
                        </label>
                        <input
                          type="time"
                          value={serviceTime}
                          onChange={(e) => setServiceTime(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (hours)
                        </label>
                        <select
                          value={durationHours}
                          onChange={(e) => setDurationHours(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="1">1 hour</option>
                          <option value="2">2 hours</option>
                          <option value="3">3 hours</option>
                          <option value="4">4 hours</option>
                          <option value="6">6 hours</option>
                          <option value="8">8 hours</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Frequency
                        </label>
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="one-time">One-time</option>
                          <option value="weekly">Weekly</option>
                          <option value="bi-weekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Property Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Type
                      </label>
                      <select
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select property type</option>
                        <option value="house">House</option>
                        <option value="apartment">Apartment</option>
                        <option value="condo">Condo</option>
                        <option value="office">Office</option>
                        <option value="retail">Retail Space</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Property Size
                      </label>
                      <select
                        value={propertySize}
                        onChange={(e) => setPropertySize(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select size</option>
                        <option value="1-2 bedrooms">1-2 bedrooms</option>
                        <option value="3-4 bedrooms">3-4 bedrooms</option>
                        <option value="5+ bedrooms">5+ bedrooms</option>
                        <option value="1000-2000 sq ft">1000-2000 sq ft</option>
                        <option value="2000-3000 sq ft">2000-3000 sq ft</option>
                        <option value="3000+ sq ft">3000+ sq ft</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe your cleaning needs
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell us about your specific cleaning needs..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special requests or considerations
                    </label>
                    <textarea
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      rows={2}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Pets, special products, access instructions, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  {submitError}
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-8 flex gap-4 justify-end">
                <button
                  onClick={() => setShowQuoteForm(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={submitQuoteRequest}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Quote Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* $5,000 Guarantee Banner */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
            <div className="flex items-center gap-3">
              <Shield className="h-12 w-12 text-green-300" />
              <div>
                <h3 className="text-2xl font-bold">$5,000 Quality Guarantee</h3>
                <p className="text-green-100">We stand behind every Boss of Clean Certified™ cleaner</p>
              </div>
            </div>
            <div className="flex items-center gap-6 ml-0 md:ml-auto">
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-6 w-6 text-green-300" />
                <span className="font-medium">Background Checked</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-green-300" />
                <span className="font-medium">Fully Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-300" />
                <span className="font-medium">Photo Verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Location Section */}
      <section className="py-8 bg-blue-50 border-t border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-lg text-gray-700 mb-4">
              <strong>Serving All 67 Counties in Florida</strong> • Orlando • Miami • Tampa • Jacksonville • Fort Lauderdale • Tallahassee • And More!
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">500+</div>
                <div className="text-sm text-gray-600">Verified Cleaners</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">10K+</div>
                <div className="text-sm text-gray-600">Jobs Completed</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-yellow-600">24/7</div>
                <div className="text-sm text-gray-600">Support</div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">67</div>
                <div className="text-sm text-gray-600">FL Counties</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Professional Cleaning Services
            </h2>
            <p className="text-lg text-gray-600">
              Connect with trusted cleaners for every type of cleaning need
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition duration-300">
                <service.icon className="h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {service.name}
                </h3>
                <p className="text-gray-600">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Get connected with professional cleaners in three simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Search & Compare
              </h3>
              <p className="text-gray-600">
                Enter your location and service needs to find qualified cleaners in your area
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Read Reviews
              </h3>
              <p className="text-gray-600">
                Compare ratings, reviews, and pricing from multiple cleaning professionals
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Book & Relax
              </h3>
              <p className="text-gray-600">
                Contact your chosen cleaner directly and enjoy professional cleaning services
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center mb-2">
                <Users className="h-8 w-8 mr-2" />
                <span className="text-3xl font-bold">500+</span>
              </div>
              <p className="text-blue-100">Verified Cleaners</p>
            </div>
            
            <div>
              <div className="flex items-center justify-center mb-2">
                <MapPin className="h-8 w-8 mr-2" />
                <span className="text-3xl font-bold">67</span>
              </div>
              <p className="text-blue-100">Florida Counties</p>
            </div>
            
            <div>
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-8 w-8 mr-2" />
                <span className="text-3xl font-bold">10K+</span>
              </div>
              <p className="text-blue-100">Jobs Completed</p>
            </div>
            
            <div>
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-8 w-8 mr-2" />
                <span className="text-3xl font-bold">24/7</span>
              </div>
              <p className="text-blue-100">Customer Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-lg text-gray-600">
              Real reviews from satisfied customers across Florida
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">
                  "{testimonial.text}"
                </p>
                <div className="flex items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-green-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Find Your Perfect Cleaner?
          </h2>
          <p className="text-lg text-green-100 mb-8">
            Join thousands of satisfied customers who found their ideal cleaning service through Boss of Clean
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleSearch}
              className="bg-white text-green-600 px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition duration-300"
            >
              Start Your Search
            </button>
            <button 
              onClick={handleListBusiness}
              className="border-2 border-white text-white px-8 py-3 rounded-md font-semibold hover:bg-white hover:text-green-600 transition duration-300"
            >
              List Your Business
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}