'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Star, CheckCircle, Users, Clock, Shield, Home, Building2, Droplets, Sparkles, Wind, Brush, BadgeCheck, DollarSign, Phone } from 'lucide-react';

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
      verified: true,
      service: 'Deep Cleaning',
      savings: '$85',
      text: 'Found an amazing cleaning service through Boss of Clean. They were professional, thorough, and reasonably priced! Saved $85 compared to other quotes.',
      avatar: '👩‍💼'
    },
    {
      name: 'Mike Rodriguez',
      location: 'Miami, FL', 
      rating: 5,
      verified: true,
      service: 'Commercial Cleaning',
      savings: '$200',
      text: 'As a business owner, I needed reliable commercial cleaning. Boss of Clean connected me with the perfect team. Now saving $200/month!',
      avatar: '👨‍💼'
    },
    {
      name: 'Jennifer Smith',
      location: 'Tampa, FL',
      rating: 5,
      verified: true,
      service: 'House Cleaning',
      savings: '$45',
      text: 'The search process was so easy! Within minutes I had quotes from multiple qualified cleaners in my area. Found one $45 cheaper than my old service.',
      avatar: '👩‍🏫'
    },
    {
      name: 'Carlos Martinez',
      location: 'Jacksonville, FL',
      rating: 5,
      verified: true,
      service: 'Pressure Washing',
      savings: '$120',
      text: 'Incredible service! The cleaner Boss of Clean matched me with transformed my driveway. Professional, insured, and saved me $120!',
      avatar: '👨‍🔧'
    },
    {
      name: 'Lisa Chen',
      location: 'Fort Lauderdale, FL',
      rating: 5,
      verified: true,
      service: 'Move-out Cleaning',
      savings: '$95',
      text: 'Moving was stressful until I found Boss of Clean. Got my full deposit back thanks to their recommended cleaner. Worth every penny!',
      avatar: '👩‍💻'
    },
    {
      name: 'Robert Williams',
      location: 'Tallahassee, FL',
      rating: 5,
      verified: true,
      service: 'Office Cleaning',
      savings: '$300',
      text: 'Running a law firm means everything must be spotless. Boss of Clean found us a team that exceeds expectations every time.',
      avatar: '👨‍⚖️'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col pt-16 sm:pt-20">
        {/* Hero Background Image - Responsive positioning */}
        <div 
          className="absolute inset-0 bg-blue-50 sm:bg-transparent"
        >
          {/* Mobile: Show full cat mascot with contain */}
          <div 
            className="block sm:hidden absolute inset-0 bg-no-repeat bg-center"
            style={{
              backgroundImage: "url('/images/ChatGPT Image Aug 5, 2025, 05_04_11 PM.png')",
              backgroundSize: 'contain',
            }}
          />
          {/* Desktop: Original cover behavior */}
          <div 
            className="hidden sm:block absolute inset-0 bg-cover bg-no-repeat"
            style={{
              backgroundImage: "url('/images/ChatGPT Image Aug 5, 2025, 05_04_11 PM.png')",
              backgroundPosition: 'center 30%',
            }}
          />
        </div>
        
        {/* Content Container */}
        <div className="relative flex-1 flex flex-col justify-end">
          {/* Upper section - Let the cat CEO shine */}
          <div className="flex-1 min-h-[45vh] sm:min-h-[40vh] md:min-h-[50vh]"></div>
          
          {/* Lower section - Text and Search Form */}
          <div className="bg-gradient-to-t from-white/98 via-white/95 to-white/85 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 md:py-16">
              <div className="text-center">
                {/* Main Headlines */}
                <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">
                  <span className="text-blue-600">BOSS</span> <span className="text-gray-900">OF</span> <span className="text-blue-600">CLEAN</span>
                </h1>
                <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-800 mb-2">
                  Florida's #1 Cleaning Directory
                </h2>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 mb-4 sm:mb-6 font-medium">
                  Find Any Cleaner in <span className="text-blue-600 font-bold">60 Seconds</span>
                </p>
                
                {/* Enhanced Social Proof & Urgency */}
                <div className="space-y-3 mb-6">
                  <div className="bg-red-100 border border-red-300 rounded-lg px-4 py-2 inline-block">
                    <p className="text-red-700 text-sm font-semibold flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span className="animate-pulse">🔥</span> 247 people searched in the last hour
                    </p>
                  </div>
                  <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2 inline-block">
                    <p className="text-green-700 text-sm font-semibold flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      ⭐ 4.9/5 rating • 2,847+ happy customers this month
                    </p>
                  </div>
                  <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2 inline-block">
                    <p className="text-blue-700 text-sm font-semibold flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      💼 Get quotes from 3-5 cleaners in your area instantly
                    </p>
                  </div>
                </div>
                
                {/* Mobile Quick Actions - Show only on small screens */}
                <div className="block sm:hidden mb-6">
                  <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-bold text-center mb-4 text-gray-900">Need Cleaning Now?</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => {
                          setServiceType('House Cleaning');
                          handleSearch();
                        }}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-3 px-4 rounded-lg text-sm transition-colors border border-blue-200"
                      >
                        🏠 House Cleaning
                      </button>
                      <button 
                        onClick={() => {
                          setServiceType('Deep Cleaning');
                          handleSearch();
                        }}
                        className="bg-green-50 hover:bg-green-100 text-green-700 font-semibold py-3 px-4 rounded-lg text-sm transition-colors border border-green-200"
                      >
                        ✨ Deep Cleaning
                      </button>
                      <button 
                        onClick={() => {
                          setServiceType('Office Cleaning');
                          handleSearch();
                        }}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-3 px-4 rounded-lg text-sm transition-colors border border-purple-200"
                      >
                        🏢 Office Cleaning
                      </button>
                      <button 
                        onClick={() => {
                          setServiceType('Pressure Washing');
                          handleSearch();
                        }}
                        className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 font-semibold py-3 px-4 rounded-lg text-sm transition-colors border border-yellow-200"
                      >
                        💧 Pressure Wash
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Tap any service to find cleaners in your area
                    </p>
                  </div>
                </div>

                {/* Main Search Form */}
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
                    
                    {/* Enhanced CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={handleSearch}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[60px] flex items-center justify-center group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                        <Search className="h-6 w-6 mr-3 group-hover:animate-bounce relative z-10" />
                        <span className="relative z-10 flex flex-col items-center sm:flex-row">
                          <span>Get Free Quotes Now</span>
                          <span className="text-xs mt-1 sm:mt-0 sm:ml-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full animate-pulse">100% FREE</span>
                        </span>
                      </button>
                      <button 
                        onClick={handleListBusiness}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[60px] flex items-center justify-center group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                        <DollarSign className="h-6 w-6 mr-3 relative z-10" />
                        <span className="relative z-10 flex flex-col items-center sm:flex-row">
                          <span>Earn $2,000+/Month</span>
                          <span className="text-xs mt-1 sm:mt-0 sm:ml-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">FIRST MONTH FREE</span>
                        </span>
                      </button>
                    </div>
                    
                    {/* Emergency Contact */}
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">Need help immediately?</p>
                      <a 
                        href="tel:+1-855-BOSS-CLEAN" 
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-lg"
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        Call (855) BOSS-CLEAN
                      </a>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.slice(0, 6).map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                {/* Header with stars and verified badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  {testimonial.verified && (
                    <div className="flex items-center bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </div>
                  )}
                </div>
                
                {/* Service type and savings */}
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                    {testimonial.service}
                  </span>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                    Saved {testimonial.savings}
                  </span>
                </div>
                
                {/* Testimonial text */}
                <p className="text-gray-600 mb-4 italic text-sm leading-relaxed">
                  "{testimonial.text}"
                </p>
                
                {/* Author info with avatar */}
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg mr-3">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Trust indicators below testimonials */}
          <div className="mt-12 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border border-blue-100">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Why Florida Trusts Boss of Clean</h3>
              <p className="text-gray-600">Over 10,000 successful connections and counting</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Background Verified</h4>
                <p className="text-sm text-gray-600">All cleaners screened & verified</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Insured & Bonded</h4>
                <p className="text-sm text-gray-600">$5,000+ insurance coverage</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">4.9★ Average Rating</h4>
                <p className="text-sm text-gray-600">Based on 2,847+ reviews</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">24/7 Support</h4>
                <p className="text-sm text-gray-600">We're here when you need us</p>
              </div>
            </div>
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