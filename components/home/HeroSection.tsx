'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown } from 'lucide-react';

const SERVICE_OPTIONS = [
  'House Cleaning',
  'Deep Cleaning',
  'Move-In / Move-Out Cleaning',
  'Post-Construction Cleaning',
  'Carpet Cleaning',
  'Window Cleaning',
  'Pressure Washing',
  'Pool Cleaning',
  'Air Duct Cleaning',
  'Landscaping',
  'Tree Removal / Trimming',
  'Mobile Car Wash / Auto Detailing',
  'Gutter Cleaning',
  'Roof Cleaning',
  'Upholstery Cleaning',
  'Tile and Grout Cleaning',
  'Patio / Deck Cleaning',
  'Garage Cleaning',
  'Organizing / Decluttering',
  'Airbnb / Vacation Rental Turnover',
];

export default function HeroSection() {
  const [serviceType, setServiceType] = useState('');
  const [zipCode, setZipCode] = useState('');
  const router = useRouter();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (serviceType) params.set('service', serviceType);
    if (zipCode) params.set('zip', zipCode);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-brand-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-navy to-brand-dark" />
        {/* Subtle gold accent orb */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-brand-gold/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32 lg:pt-36 lg:pb-40">
        <div className="text-center max-w-4xl mx-auto">
          {/* Tagline */}
          <p className="inline-block text-brand-gold text-sm font-semibold tracking-[0.2em] uppercase mb-6 border border-brand-gold/30 rounded-full px-5 py-1.5">
            Purrfection is our Standard
          </p>

          {/* Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1] mb-6">
            Your Home Deserves{' '}
            <span className="text-brand-gold">Purrfection</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-12 leading-relaxed">
            Connect with independent cleaning professionals across Florida.
            Compare options. Choose with confidence.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4 max-w-3xl mx-auto"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Service Type */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  className="w-full pl-12 pr-10 py-4 bg-brand-cream rounded-xl text-brand-dark font-medium text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
                >
                  <option value="">What service do you need?</option>
                  {SERVICE_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              {/* ZIP Code */}
              <div className="relative sm:w-48">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="ZIP Code"
                  maxLength={5}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  className="w-full pl-12 pr-4 py-4 bg-brand-cream rounded-xl text-brand-dark font-medium text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
                />
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="bg-brand-gold hover:bg-brand-gold-light text-white px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
              >
                Find Professionals
              </button>
            </div>
          </form>

          {/* Subtle descriptor */}
          <p className="mt-6 text-gray-400 text-sm">
            Florida&apos;s residential cleaning and home services marketplace
          </p>
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
