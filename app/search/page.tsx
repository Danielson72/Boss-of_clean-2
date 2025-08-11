'use client';

import { useState } from 'react';
import { Search, MapPin, Star, Filter, Grid, List } from 'lucide-react';

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  // Placeholder data - will be replaced with real data later
  const cleaners = [
    {
      id: 1,
      name: 'Sparkle Clean Services',
      rating: 4.8,
      reviews: 127,
      location: 'Orlando, FL',
      services: ['Residential', 'Deep Cleaning'],
      price: 'From $80/visit',
      image: '/api/placeholder/300/200'
    },
    {
      id: 2,
      name: 'Professional Plus Cleaning',
      rating: 4.9,
      reviews: 89,
      location: 'Tampa, FL',
      services: ['Commercial', 'Office Cleaning'],
      price: 'From $120/visit',
      image: '/api/placeholder/300/200'
    },
    {
      id: 3,
      name: 'Sunshine Pressure Washing',
      rating: 4.7,
      reviews: 156,
      location: 'Miami, FL',
      services: ['Pressure Washing', 'Exterior Cleaning'],
      price: 'From $150/service',
      image: '/api/placeholder/300/200'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cleaners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Location or ZIP code"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Services</option>
                <option value="residential">Residential Cleaning</option>
                <option value="commercial">Commercial Cleaning</option>
                <option value="deep">Deep Cleaning</option>
                <option value="pressure">Pressure Washing</option>
                <option value="window">Window Cleaning</option>
                <option value="carpet">Carpet Cleaning</option>
              </select>
            </div>
            
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-300">
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
              Cleaning Services in Florida
            </h1>
            <p className="text-gray-600">
              Found {cleaners.length} cleaning professionals near you
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
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

        {/* Results Grid */}
        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {cleaners.map((cleaner) => (
            <div key={cleaner.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300">
              <div className="h-48 bg-gray-200 flex items-center justify-center">
                <div className="text-gray-500">Business Photo</div>
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {cleaner.name}
                  </h3>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium text-gray-700 ml-1">
                      {cleaner.rating}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-2">
                  {cleaner.location} • {cleaner.reviews} reviews
                </p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {cleaner.services.map((service, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {service}
                    </span>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-600">
                    {cleaner.price}
                  </span>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results Message */}
        {cleaners.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No cleaners found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search criteria or location
            </p>
          </div>
        )}
      </div>
    </div>
  );
}