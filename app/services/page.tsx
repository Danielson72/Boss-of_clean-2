import { Metadata } from 'next';
import Link from 'next/link';
import {
  Home, Building2, Sparkles, Droplets, LayoutGrid,
  PackageOpen, HardHat, CalendarCheck, Briefcase,
  ChevronRight, type LucideIcon
} from 'lucide-react';
import { SERVICE_TYPES } from '@/lib/data/service-types';

export const metadata: Metadata = {
  title: 'Cleaning Services in Florida | Boss of Clean',
  description: 'Browse all professional cleaning services available in Florida. Residential, commercial, deep cleaning, pressure washing, and more. Find verified cleaners near you.',
  keywords: 'cleaning services Florida, house cleaning, commercial cleaning, pressure washing, carpet cleaning, window cleaning',
  openGraph: {
    title: 'Cleaning Services in Florida | Boss of Clean',
    description: 'Browse all professional cleaning services available in Florida. Find verified cleaners near you.',
    type: 'website',
  },
};

const iconMap: Record<string, LucideIcon> = {
  Home,
  Building2,
  Sparkles,
  Droplets,
  RectangleHorizontal: LayoutGrid,
  LayoutGrid,
  PackageOpen,
  HardHat,
  CalendarCheck,
  Briefcase,
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-blue-100 text-sm mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-white font-medium">Services</span>
          </nav>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Cleaning Services in Florida
          </h1>
          <p className="text-lg md:text-xl text-blue-100 max-w-3xl">
            Find professional cleaners for any job. From regular house cleaning to
            specialized services like pressure washing and post-construction cleanup,
            we connect you with verified Florida professionals.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICE_TYPES.map((service) => {
              const Icon = iconMap[service.icon] || Home;
              return (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="group bg-white rounded-xl shadow-sm border hover:shadow-lg hover:border-blue-200 transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <Icon className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {service.name}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">
                          ${service.priceRange.min} - ${service.priceRange.max}
                        </span>
                        <span className="text-gray-500">
                          {service.priceRange.unit === 'hour' && '/hr'}
                          {service.priceRange.unit === 'sqft' && '/sqft'}
                          {service.priceRange.unit === 'job' && ' per job'}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:translate-x-1 transition-transform">
                        Learn more
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Boss of Clean Section */}
      <section className="py-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Why Choose Boss of Clean?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verified Professionals</h3>
              <p className="text-gray-600">
                All cleaners are background-checked, insured, and verified for quality service.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Free Quotes</h3>
              <p className="text-gray-600">
                Get multiple free quotes to compare prices and find the best value for your needs.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Florida-Wide Coverage</h3>
              <p className="text-gray-600">
                Cleaners available across all 67 Florida counties, from Miami to Pensacola.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Find Your Perfect Cleaner?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Search thousands of verified cleaning professionals in Florida.
            Compare quotes and book in minutes.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
          >
            Search Cleaners Now
          </Link>
        </div>
      </section>
    </div>
  );
}
