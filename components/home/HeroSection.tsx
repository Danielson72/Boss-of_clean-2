'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, MapPin, ChevronDown, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Fallback only — the live list is passed in from service_categories.
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

export default function HeroSection({ services }: { services?: string[] }) {
  const options = services && services.length > 0 ? services : SERVICE_OPTIONS;
  const [serviceType, setServiceType] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetQuery, setSheetQuery] = useState('');
  const router = useRouter();

  const filteredOptions = options.filter((s) =>
    s.toLowerCase().includes(sheetQuery.trim().toLowerCase())
  );

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
              Any Service. Any Pro.{' '}
              <span className="text-brand-gold">One Boss.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              Florida&apos;s fair, transparent alternative to Thumbtack, Angi, and HomeAdvisor.
              Local pros for cleaning, handyman, HVAC, plumbing, electrical, pool service,
              and every job your home or business needs.
            </p>

            {/* Search Form */}
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4 max-w-3xl mx-auto lg:mx-0"
            >
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Service Type — searchable bottom sheet on small screens,
                    native select from sm: up. 16px font prevents iOS zoom. */}
                <div className="relative flex-1">
                  {/* Mobile: bottom-sheet picker */}
                  <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                      <button
                        type="button"
                        className="sm:hidden w-full pl-12 pr-10 py-4 min-h-[48px] bg-brand-cream rounded-xl text-left font-medium text-base focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                      >
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        <span className={serviceType ? 'text-brand-dark' : 'text-gray-400'}>
                          {serviceType || 'What service do you need?'}
                        </span>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl p-0 flex flex-col">
                      <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={sheetQuery}
                            onChange={(e) => setSheetQuery(e.target.value)}
                            placeholder="Search services..."
                            className="w-full pl-12 pr-4 py-3 min-h-[48px] bg-brand-cream rounded-xl text-brand-dark text-base focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2">
                        {filteredOptions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setServiceType(s);
                              setSheetOpen(false);
                              setSheetQuery('');
                            }}
                            className="w-full flex items-center justify-between px-4 py-3.5 min-h-[48px] rounded-xl text-left text-base text-brand-dark hover:bg-brand-cream active:bg-brand-cream"
                          >
                            {s}
                            {serviceType === s && <Check className="h-5 w-5 text-brand-gold" />}
                          </button>
                        ))}
                        {filteredOptions.length === 0 && (
                          <p className="px-4 py-6 text-center text-gray-400 text-base">No matching services</p>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Desktop / tablet: native select */}
                  <div className="hidden sm:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    <select
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full pl-12 pr-10 py-4 min-h-[48px] bg-brand-cream rounded-xl text-brand-dark font-medium text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
                    >
                      <option value="">What service do you need?</option>
                      {options.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
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
                    className="w-full pl-12 pr-4 py-4 min-h-[48px] bg-brand-cream rounded-xl text-brand-dark font-medium text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 transition-shadow"
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
              Your one boss for any clean, fix, or service in Florida — residential &amp; commercial
            </p>
          </div>

          {/* Right column — CEO Cat Image */}
          <div className="relative flex-shrink-0 order-1 lg:order-2 w-64 sm:w-80 md:w-96 lg:w-[420px] xl:w-[480px]">
            {/* Gold glow behind the frame — layered for rich highlight effect */}
            <div className="absolute -inset-8 bg-brand-gold/20 rounded-[2rem] blur-[60px] animate-pulse-slow motion-reduce:animate-none" />
            <div className="absolute -inset-5 bg-brand-gold/15 rounded-3xl blur-3xl" />
            <div className="absolute -inset-3 bg-brand-gold/10 rounded-2xl blur-2xl" />

            {/* Picture frame with float animation */}
            <div className="relative animate-float motion-reduce:animate-none">
              {/* The frame border — layered for depth */}
              <div className="relative rounded-2xl overflow-hidden border-[3px] border-brand-gold/70 shadow-[0_0_20px_rgba(200,163,95,0.4),0_0_60px_rgba(200,163,95,0.15),0_8px_32px_rgba(0,0,0,0.3)]">
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
