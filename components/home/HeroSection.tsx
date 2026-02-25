'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-brand-gold/3 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 sm:pt-20 sm:pb-28 lg:pt-24 lg:pb-32">
        {/* Mobile: stack (image on top), Desktop: split layout */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

          {/* Left column — Text + Search */}
          <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
            {/* Tagline */}
            <p className="inline-block text-brand-gold text-sm font-semibold tracking-[0.2em] uppercase mb-6 border border-brand-gold/30 rounded-full px-5 py-1.5">
              Purrfection is our Standard
            </p>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] mb-6">
              Your Home Deserves{' '}
              <span className="text-brand-gold">Purrfection</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              Connect with independent cleaning professionals across Florida.
              Compare options. Choose with confidence.
            </p>

            {/* Search Form */}
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4 max-w-3xl mx-auto lg:mx-0"
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
                  className="bg-brand-gold hover:bg-brand-gold-light text-white px-8 py-4 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap min-h-[44px]"
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

          {/* Right column — CEO Cat Image */}
          <div className="relative flex-shrink-0 order-1 lg:order-2 w-64 sm:w-80 md:w-96 lg:w-[420px] xl:w-[480px]">
            {/* Gold glow behind the frame */}
            <div className="absolute -inset-4 bg-brand-gold/10 rounded-3xl blur-3xl" />
            <div className="absolute -inset-2 bg-brand-gold/5 rounded-2xl blur-2xl" />

            {/* Picture frame with float animation */}
            <div className="relative animate-float motion-reduce:animate-none">
              {/* The frame border — layered for depth */}
              <div className="relative rounded-2xl overflow-hidden border-[3px] border-brand-gold/60 shadow-[0_8px_32px_rgba(200,163,95,0.25),0_2px_8px_rgba(0,0,0,0.3)]">
                {/* Inner gold accent line */}
                <div className="absolute inset-0 rounded-2xl border-[1px] border-brand-gold/20 pointer-events-none z-10" />

                {/* The actual image */}
                <div className="relative aspect-[3/4]">
                  <Image
                    src="/images/ceo-cat-hero.png"
                    alt="Boss of Clean mascot — a professional cat CEO in a business suit with Orlando skyline"
                    fill
                    sizes="(max-width: 640px) 256px, (max-width: 768px) 320px, (max-width: 1024px) 384px, 480px"
                    className="object-cover"
                    priority
                  />
                </div>

                {/* Bottom nameplate bar — like a business card or award plaque */}
                <div className="relative bg-gradient-to-r from-brand-dark via-brand-navy to-brand-dark px-4 py-3 text-center border-t border-brand-gold/30">
                  <p className="font-display text-brand-gold text-sm sm:text-base font-bold tracking-wide">
                    Boss of Clean
                  </p>
                  <p className="text-gray-400 text-[10px] sm:text-xs tracking-[0.15em] uppercase mt-0.5">
                    Purrfection is our Standard
                  </p>
                </div>
              </div>

              {/* Subtle corner accents — decorative gold corners */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-brand-gold/40 rounded-tl-lg pointer-events-none" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-brand-gold/40 rounded-tr-lg pointer-events-none" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-brand-gold/40 rounded-bl-lg pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-brand-gold/40 rounded-br-lg pointer-events-none" />
            </div>
          </div>
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
