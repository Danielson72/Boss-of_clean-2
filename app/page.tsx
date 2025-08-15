'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Star, CheckCircle, Users, Clock, Shield, Home, Building2, Droplets, Sparkles, Wind, Brush } from 'lucide-react';

export default function HomePage() {
  const [serviceType, setServiceType] = useState('');
  const [zipCode, setZipCode] = useState('');
  const router = useRouter();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (serviceType) params.set('service', serviceType);
    if (zipCode) params.set('zip', zipCode);
    
    router.push(`/search?${params.toString()}`);
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
            backgroundImage: "url('/images/ChatGPT Image Aug 5, 2025, 05_04_11 PM.png')",
            backgroundPosition: 'center center',
            backgroundSize: 'cover',
            transform: 'scale(0.85)'
          }}
        />
        
        {/* Content Container */}
        <div className="relative flex-1 flex flex-col justify-end">
          {/* Upper section - Let the cat CEO shine */}
          <div className="flex-1 min-h-[40vh] md:min-h-[60vh]"></div>
          
          {/* Lower section - Text and Search Form */}
          <div className="bg-gradient-to-t from-white/95 via-white/90 to-transparent backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
              <div className="text-center">
                {/* Main Headlines */}
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-gray-900 mb-4 tracking-tight">
                  <span className="text-blue-600">BOSS</span> <span className="text-gray-900">OF</span> <span className="text-blue-600">CLEAN</span>
                </h1>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-gray-800 mb-2">
                  Florida's #1 Cleaning Directory
                </h2>
                <p className="text-lg sm:text-xl md:text-2xl text-gray-700 mb-8 font-medium">
                  Find Any Cleaner in <span className="text-blue-600 font-bold">60 Seconds</span>
                </p>
                
                {/* Search Form */}
                <div className="max-w-4xl mx-auto">
                  <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-gray-200">
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
                    
                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={handleSearch}
                        className="flex-1 sm:flex-none bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[60px] flex items-center justify-center"
                      >
                        <Search className="h-6 w-6 mr-3" />
                        Find a Cleaner Now
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