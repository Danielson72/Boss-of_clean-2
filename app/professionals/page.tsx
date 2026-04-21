import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import {
  Star,
  MapPin,
  Shield,
  ArrowRight,
  User,
  Search,
  BadgeCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Find Verified Home Service Professionals in Florida',
  description:
    'Browse our directory of verified, insured home service professionals across Florida. View portfolios, read reviews, and request free quotes. Purrfection is our Standard.',
  openGraph: {
    title: 'Find Verified Home Service Professionals | Boss of Clean',
    description:
      'Browse our directory of verified, insured home service professionals across Florida. View portfolios, read reviews, and request free quotes.',
    url: 'https://bossofclean.com/professionals',
  },
};

interface DirectoryCleaner {
  id: string;
  business_name: string;
  business_slug: string | null;
  business_description: string | null;
  services: string[] | null;
  service_areas: string[] | null;
  profile_image_url: string | null;
  average_rating: number | null;
  total_reviews: number | null;
  total_jobs: number | null;
  hourly_rate: number | null;
  years_experience: number | null;
  insurance_verified: boolean;
  instant_booking: boolean;
  subscription_tier: string;
  users:
    | { city: string | null; state: string | null }
    | { city: string | null; state: string | null }[];
}

function getUser(cleaner: DirectoryCleaner) {
  if (!cleaner.users) return null;
  return Array.isArray(cleaner.users) ? cleaner.users[0] : cleaner.users;
}

// Service types for filter
// Coverall carve-out (DLD-256): 'Commercial Cleaning' removed pending
// franchisor approval.
const SERVICE_OPTIONS = [
  'Residential Cleaning',
  'Deep Cleaning',
  'Move In/Out Cleaning',
  'Pressure Washing',
  'Carpet Cleaning',
  'Window Cleaning',
  'Post-Construction',
  'Pool Cleaning',
  'Landscaping',
  'Junk Removal',
  'Organizing',
  'Laundry Services',
  'Pet-Friendly Cleaning',
  'Green/Eco Cleaning',
];

interface ProfessionalsPageProps {
  searchParams: Promise<{ service?: string; sort?: string }>;
}

export default async function ProfessionalsPage({
  searchParams,
}: ProfessionalsPageProps) {
  const params = await searchParams;
  const activeService = params.service || '';
  const sortBy = params.sort || 'rating';

  const supabase = await createClient();

  let query = supabase
    .from('cleaners')
    .select(
      `
      id, business_name, business_slug, business_description,
      services, service_areas, profile_image_url,
      average_rating, total_reviews, total_jobs, hourly_rate,
      years_experience, insurance_verified, instant_booking, subscription_tier,
      users(city, state)
    `
    )
    .eq('approval_status', 'approved');

  if (activeService) {
    query = query.contains('services', [activeService]);
  }

  switch (sortBy) {
    case 'reviews':
      query = query.order('total_reviews', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'price_low':
      query = query.order('hourly_rate', { ascending: true });
      break;
    case 'price_high':
      query = query.order('hourly_rate', { ascending: false });
      break;
    default:
      // rating
      query = query
        .order('average_rating', { ascending: false })
        .order('total_reviews', { ascending: false });
  }

  const { data: cleaners } = await query;
  const pros = (cleaners || []) as DirectoryCleaner[];

  // Build sort URL helper
  function sortUrl(sort: string) {
    const p = new URLSearchParams();
    if (activeService) p.set('service', activeService);
    if (sort !== 'rating') p.set('sort', sort);
    const qs = p.toString();
    return qs ? `/professionals?${qs}` : '/professionals';
  }

  function serviceUrl(service: string) {
    const p = new URLSearchParams();
    if (service) p.set('service', service);
    if (sortBy !== 'rating') p.set('sort', sortBy);
    const qs = p.toString();
    return qs ? `/professionals?${qs}` : '/professionals';
  }

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Verified Home Service Professionals in Florida',
    description:
      'Directory of verified, insured home service professionals on Boss of Clean.',
    url: 'https://bossofclean.com/professionals',
    numberOfItems: pros.length,
    itemListElement: pros.slice(0, 20).map((pro, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: pro.business_name,
        url: `https://bossofclean.com/cleaner/${pro.business_slug || pro.id}`,
        aggregateRating: pro.total_reviews
          ? {
              '@type': 'AggregateRating',
              ratingValue: pro.average_rating || 0,
              reviewCount: pro.total_reviews,
            }
          : undefined,
        image: pro.profile_image_url || undefined,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <div className="min-h-screen bg-brand-cream">
        {/* Hero */}
        <section className="bg-brand-dark text-white py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl lg:text-5xl font-bold font-display mb-4">
              Our Verified Professionals
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
              Every professional on Boss of Clean is vetted and verified.
              Browse portfolios, read real reviews, and request a free quote.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/quote-request"
                className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                Get Free Quotes
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
              >
                <Search className="h-5 w-5" />
                Search by Location
              </Link>
            </div>
          </div>
        </section>

        {/* Filters + Sort */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Service filters — horizontal scrollable */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Filter by Service
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-hide">
              <Link
                href="/professionals"
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  !activeService
                    ? 'bg-brand-dark text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-brand-gold'
                }`}
              >
                All Services
              </Link>
              {SERVICE_OPTIONS.map((service) => (
                <Link
                  key={service}
                  href={serviceUrl(
                    activeService === service ? '' : service
                  )}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                    activeService === service
                      ? 'bg-brand-dark text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-brand-gold'
                  }`}
                >
                  {service}
                </Link>
              ))}
            </div>
          </div>

          {/* Sort + Count */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <p className="text-gray-600">
              <span className="font-semibold text-brand-dark">
                {pros.length}
              </span>{' '}
              professional{pros.length !== 1 ? 's' : ''} found
              {activeService && (
                <span>
                  {' '}
                  for{' '}
                  <span className="font-medium text-brand-dark">
                    {activeService}
                  </span>
                </span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              <div className="flex gap-1">
                {[
                  { key: 'rating', label: 'Top Rated' },
                  { key: 'reviews', label: 'Most Reviews' },
                  { key: 'newest', label: 'Newest' },
                  { key: 'price_low', label: 'Price: Low' },
                  { key: 'price_high', label: 'Price: High' },
                ].map((opt) => (
                  <Link
                    key={opt.key}
                    href={sortUrl(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      sortBy === opt.key
                        ? 'bg-brand-dark text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Pro Grid */}
          {pros.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pros.map((pro) => {
                const user = getUser(pro);
                const profileUrl = `/cleaner/${pro.business_slug || pro.id}`;

                return (
                  <div
                    key={pro.id}
                    className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-brand-gold/40 hover:shadow-lg transition-all duration-300"
                  >
                    {/* Photo */}
                    <Link
                      href={profileUrl}
                      className="block"
                      aria-label={`View ${pro.business_name} profile`}
                    >
                      <div className="relative h-48 bg-brand-cream overflow-hidden">
                        {pro.profile_image_url ? (
                          <Image
                            src={pro.profile_image_url}
                            alt={`${pro.business_name} profile photo`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="h-16 w-16 text-gray-300" />
                          </div>
                        )}
                        {/* Tier badge overlay */}
                        {pro.subscription_tier === 'enterprise' && (
                          <span className="absolute top-3 left-3 bg-brand-gold text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                            Featured
                          </span>
                        )}
                        {pro.subscription_tier === 'pro' && (
                          <span className="absolute top-3 left-3 bg-purple-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                            Pro
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="p-5">
                      {/* Name */}
                      <Link href={profileUrl} className="group/name">
                        <h3 className="font-display text-lg font-bold text-brand-dark group-hover/name:text-brand-gold transition-colors mb-1">
                          {pro.business_name}
                        </h3>
                      </Link>

                      {/* Rating */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i <
                                Math.round(pro.average_rating || 0)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {(pro.average_rating || 0).toFixed(1)}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({pro.total_reviews || 0})
                        </span>
                      </div>

                      {/* Location */}
                      {user?.city && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                          <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span>
                            {user.city}
                            {user.state ? `, ${user.state}` : ', FL'}
                          </span>
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                        {pro.business_description ||
                          'Professional cleaning services'}
                      </p>

                      {/* Trust signals */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {pro.insurance_verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                            <Shield className="h-3 w-3" />
                            Insured
                          </span>
                        )}
                        {pro.instant_booking && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">
                            <BadgeCheck className="h-3 w-3" />
                            Instant Book
                          </span>
                        )}
                        {(pro.years_experience || 0) >= 5 && (
                          <span className="px-2 py-0.5 bg-brand-cream text-brand-dark text-xs rounded-full">
                            {pro.years_experience}+ yrs
                          </span>
                        )}
                      </div>

                      {/* Services */}
                      {pro.services && pro.services.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {pro.services.slice(0, 3).map((service) => (
                            <span
                              key={service}
                              className="px-2.5 py-1 bg-brand-cream text-brand-dark text-xs font-medium rounded-full"
                            >
                              {service}
                            </span>
                          ))}
                          {pro.services.length > 3 && (
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                              +{pro.services.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Price + CTA */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        {pro.hourly_rate ? (
                          <div>
                            <span className="text-lg font-bold text-brand-dark">
                              ${pro.hourly_rate}
                            </span>
                            <span className="text-sm text-gray-500">
                              /hr
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Request pricing
                          </span>
                        )}
                        <Link
                          href={profileUrl}
                          className="inline-flex items-center gap-1.5 bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-navy transition group/btn"
                        >
                          View Profile
                          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty state */
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-brand-dark mb-2">
                No professionals found
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {activeService
                  ? `We don't have any approved professionals for "${activeService}" yet. Try a different service or check back soon.`
                  : 'No approved professionals available right now. Check back soon!'}
              </p>
              {activeService && (
                <Link
                  href="/professionals"
                  className="inline-flex items-center gap-2 bg-brand-dark text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-navy transition"
                >
                  View All Professionals
                </Link>
              )}
            </div>
          )}
        </div>

        {/* CTA */}
        <section className="bg-brand-dark text-white py-16 mt-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold font-display mb-4">
              Are You a Cleaning Professional?
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Join Boss of Clean and connect with customers across Florida.
              Fair pricing, no predatory lead fees, and a marketplace built
              for real professionals.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-white px-8 py-4 rounded-lg font-semibold text-lg transition shadow-lg hover:shadow-xl"
            >
              List Your Business
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
