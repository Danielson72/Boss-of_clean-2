'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown } from 'lucide-react';
import { SERVICE_TYPES } from '@/lib/data/service-types';

interface SearchBarProps {
  initialService?: string;
  initialZip?: string;
  onSearch: (service: string, zip: string) => void;
}

export function SearchBar({ initialService, initialZip, onSearch }: SearchBarProps) {
  const [service, setService] = useState(initialService || '');
  const [zip, setZip] = useState(initialZip || '');

  useEffect(() => {
    if (initialService !== undefined) setService(initialService);
  }, [initialService]);

  useEffect(() => {
    if (initialZip !== undefined) setZip(initialZip);
  }, [initialZip]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(service, zip);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Dark gradient background matching homepage hero */}
      <div className="absolute inset-0 bg-brand-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-brand-gold/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-[1.1] mb-4">
            Find Cleaning{' '}
            <span className="text-brand-gold">Professionals</span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
            Browse independent cleaning pros across Florida. No fake reviews, no inflated ratings — just real professionals ready to help.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4 max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Service Type Dropdown */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-brand-cream rounded-xl text-brand-dark font-medium text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
                  aria-label="Select service type"
                >
                  <option value="">All Services</option>
                  {SERVICE_TYPES.map((st) => (
                    <option key={st.slug} value={st.shortName}>
                      {st.shortName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              {/* ZIP Code Input */}
              <div className="relative sm:w-48">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setZip(val);
                  }}
                  placeholder="ZIP Code"
                  maxLength={5}
                  inputMode="numeric"
                  className="w-full pl-12 pr-4 py-4 bg-brand-cream rounded-xl text-brand-dark font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
                  aria-label="Enter ZIP code"
                />
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="bg-brand-gold hover:bg-brand-gold-light text-white px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap min-h-[44px] min-w-[44px]"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom curve */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full h-8 sm:h-12">
          <path d="M0 60V20C360 -5 720 50 1080 20C1260 5 1380 15 1440 20V60H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}
