'use client';

import Link from 'next/link';
import {
  Home, Building2, Sparkles, Droplets, LayoutGrid,
  PackageOpen, HardHat, CalendarCheck, Briefcase, Star,
  ChevronRight, DollarSign, Clock, CheckCircle, Search,
  type LucideIcon
} from 'lucide-react';
import { ServiceType } from '@/lib/data/service-types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CleanerCard, CleanerCardSkeleton, CleanerCardProps } from '@/components/search';

// Icon map for service types
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

interface ServiceTypeContentProps {
  serviceType: ServiceType;
  cleaners: CleanerCardProps[];
  totalCount: number;
  isLoading: boolean;
  averagePrice: number | null;
  onRequestQuote?: (cleanerId: string) => void;
}

export function ServiceTypeContent({
  serviceType,
  cleaners,
  totalCount,
  isLoading,
  averagePrice,
  onRequestQuote,
}: ServiceTypeContentProps) {
  const Icon = iconMap[serviceType.icon] || Home;

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
            <Link href="/services" className="hover:text-white">
              Services
            </Link>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="text-white font-medium">{serviceType.name}</span>
          </nav>

          <div className="flex items-start gap-6">
            <div className="hidden sm:flex items-center justify-center w-20 h-20 bg-white/10 rounded-2xl">
              <Icon className="h-10 w-10 text-white" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                {serviceType.name} in Florida
              </h1>
              <p className="text-lg md:text-xl text-blue-100 max-w-3xl mb-6">
                {serviceType.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <DollarSign className="h-4 w-4" aria-hidden="true" />
                  <span>
                    ${serviceType.priceRange.min} - ${serviceType.priceRange.max}
                    {serviceType.priceRange.unit === 'hour' && '/hr'}
                    {serviceType.priceRange.unit === 'sqft' && '/sqft'}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span>{serviceType.averageTime}</span>
                </div>
                {averagePrice && (
                  <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full">
                    <Star className="h-4 w-4" aria-hidden="true" />
                    <span>Avg. ${averagePrice}/hr in your area</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Why Choose Professional {serviceType.shortName}?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serviceType.benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cleaners Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {serviceType.shortName} Professionals in Florida
              </h2>
              <p className="text-gray-600 mt-1">
                {isLoading
                  ? 'Finding cleaners...'
                  : `${totalCount} cleaning professional${totalCount !== 1 ? 's' : ''} available`}
              </p>
            </div>
            <Link
              href={`/search?service=${encodeURIComponent(serviceType.shortName)}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search All Cleaners
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <CleanerCardSkeleton key={i} />
              ))}
            </div>
          ) : cleaners.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cleaners.map((cleaner) => (
                  <CleanerCard
                    key={cleaner.id}
                    {...cleaner}
                    onRequestQuote={onRequestQuote}
                  />
                ))}
              </div>
              {totalCount > cleaners.length && (
                <div className="mt-8 text-center">
                  <Link
                    href={`/search?service=${encodeURIComponent(serviceType.shortName)}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    View All {totalCount} {serviceType.shortName} Professionals
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No cleaners found for {serviceType.shortName}
              </h3>
              <p className="text-gray-600 mb-6">
                We&apos;re expanding our network. Check back soon or browse all services.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse All Cleaners
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Pricing Info Section */}
      <section className="py-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {serviceType.name} Pricing in Florida
          </h2>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4">
                <p className="text-sm text-gray-600 mb-1">Starting From</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${serviceType.priceRange.min}
                </p>
                <p className="text-sm text-gray-600">
                  per {serviceType.priceRange.unit === 'hour' ? 'hour' : serviceType.priceRange.unit === 'sqft' ? 'sq ft' : 'job'}
                </p>
              </div>
              <div className="text-center p-4 border-y md:border-y-0 md:border-x border-blue-200">
                <p className="text-sm text-gray-600 mb-1">Average Cost</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${Math.round((serviceType.priceRange.min + serviceType.priceRange.max) / 2)}
                </p>
                <p className="text-sm text-gray-600">
                  typical {serviceType.priceRange.unit === 'hour' ? 'hourly rate' : 'price'}
                </p>
              </div>
              <div className="text-center p-4">
                <p className="text-sm text-gray-600 mb-1">Premium Service</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${serviceType.priceRange.max}+
                </p>
                <p className="text-sm text-gray-600">top-rated professionals</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 text-center mt-6">
              Prices vary based on home size, condition, location, and specific requirements.
              Get free quotes from multiple cleaners to compare.
            </p>
          </div>
        </div>
      </section>

      {/* Long Description Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              About {serviceType.name}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {serviceType.longDescription}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions About {serviceType.name}
          </h2>
          <div className="max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              {serviceType.faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Related Services */}
      <section className="py-12 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Related Cleaning Services
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="px-4 py-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border"
            >
              All Services
            </Link>
            {serviceType.slug !== 'residential-cleaning' && (
              <Link
                href="/services/residential-cleaning"
                className="px-4 py-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border"
              >
                Residential Cleaning
              </Link>
            )}
            {serviceType.slug !== 'deep-cleaning' && (
              <Link
                href="/services/deep-cleaning"
                className="px-4 py-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border"
              >
                Deep Cleaning
              </Link>
            )}
            {serviceType.slug !== 'commercial-cleaning' && (
              <Link
                href="/services/commercial-cleaning"
                className="px-4 py-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border"
              >
                Commercial Cleaning
              </Link>
            )}
            {serviceType.slug !== 'move-in-out-cleaning' && (
              <Link
                href="/services/move-in-out-cleaning"
                className="px-4 py-2 bg-white rounded-full text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors border"
              >
                Move In/Out Cleaning
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Book {serviceType.shortName}?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Compare quotes from verified {serviceType.shortName.toLowerCase()} professionals in your area.
            Get started in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/quote-request?service=${encodeURIComponent(serviceType.dbValue)}`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold text-lg"
            >
              Get Free Quotes
            </Link>
            <Link
              href={`/search?service=${encodeURIComponent(serviceType.shortName)}`}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-semibold text-lg"
            >
              Browse Cleaners
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
