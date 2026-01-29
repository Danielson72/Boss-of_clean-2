import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import {
  getCityBySlug,
  getAllCitySlugs,
  getPopularCities,
  FLORIDA_CITIES,
} from '@/lib/data/florida-cities';
import {
  generateCityMetadata,
  generateCityJsonLd,
  generateBreadcrumbJsonLd,
  SERVICE_DESCRIPTIONS,
  getRegionDisplayName,
} from '@/lib/seo/city-pages';
import {
  MapPin,
  Star,
  Users,
  CheckCircle,
  ArrowRight,
  Phone,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

interface CityPageProps {
  params: Promise<{ city: string }>;
}

/** Cleaner data for city page display */
interface CityPageCleaner {
  id: string;
  business_name: string;
  business_slug: string | null;
  average_rating: number;
  total_reviews: number;
  services: string[];
  hourly_rate: number | null;
  profile_image_url: string | null;
  subscription_tier: string;
  instant_booking: boolean;
  insurance_verified: boolean;
  users: { city: string | null; state: string | null } | { city: string | null; state: string | null }[];
}

// Generate static params for all cities
export async function generateStaticParams() {
  return getAllCitySlugs().map((slug) => ({ city: slug }));
}

// Generate metadata for the page
export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = getCityBySlug(citySlug);

  if (!city) {
    return { title: 'City Not Found' };
  }

  // Get cleaner stats for this city
  const supabase = await createClient();
  const { count, data: cleaners } = await supabase
    .from('cleaners')
    .select('average_rating, services', { count: 'exact' })
    .in('approval_status', ['approved', 'pending'])
    .overlaps('service_areas', city.zipCodes);

  const cleanerCount = count || 0;
  const avgRating =
    cleaners && cleaners.length > 0
      ? cleaners.reduce((sum, c) => sum + (c.average_rating || 0), 0) / cleaners.length
      : 4.5;

  // Get top services
  const serviceCounts: Record<string, number> = {};
  cleaners?.forEach((c) => {
    (c.services || []).forEach((s: string) => {
      serviceCounts[s] = (serviceCounts[s] || 0) + 1;
    });
  });
  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([service]) => service);

  return generateCityMetadata({
    city,
    cleanerCount,
    averageRating: avgRating,
    topServices,
  });
}

export default async function CityPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;
  const city = getCityBySlug(citySlug);

  if (!city) {
    notFound();
  }

  // Get cleaner data for this city
  const supabase = await createClient();
  const { count, data: cleaners } = await supabase
    .from('cleaners')
    .select(
      `
      id,
      business_name,
      business_slug,
      average_rating,
      total_reviews,
      services,
      hourly_rate,
      profile_image_url,
      subscription_tier,
      instant_booking,
      insurance_verified,
      users!inner(city, state)
    `,
      { count: 'exact' }
    )
    .in('approval_status', ['approved', 'pending'])
    .overlaps('service_areas', city.zipCodes)
    .order('subscription_tier', { ascending: false })
    .order('average_rating', { ascending: false })
    .limit(6);

  const cleanerCount = count || 0;
  const avgRating =
    cleaners && cleaners.length > 0
      ? cleaners.reduce((sum, c) => sum + (c.average_rating || 0), 0) / cleaners.length
      : 4.5;

  // Get service counts
  const serviceCounts: Record<string, number> = {};
  cleaners?.forEach((c) => {
    (c.services || []).forEach((s: string) => {
      serviceCounts[s] = (serviceCounts[s] || 0) + 1;
    });
  });
  const topServices = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([service]) => service);

  // Get nearby cities
  const nearbyCities = FLORIDA_CITIES.filter(
    (c) => city.nearbyAreas.includes(c.name) || c.nearbyAreas.includes(city.name)
  ).slice(0, 4);

  // JSON-LD structured data
  const jsonLd = generateCityJsonLd({
    city,
    cleanerCount,
    averageRating: avgRating,
    topServices,
  });
  const breadcrumbJsonLd = generateBreadcrumbJsonLd(city);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="text-blue-200 text-sm mb-6">
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link href="/search" className="hover:text-white">
                Florida
              </Link>
              <span className="mx-2">/</span>
              <span className="text-white">{city.name}</span>
            </nav>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl lg:text-5xl font-bold mb-6">
                  Professional Cleaning Services in {city.name}, FL
                </h1>
                <p className="text-xl text-blue-100 mb-8">{city.description}</p>

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mb-8">
                  <div className="flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    <span className="text-2xl font-bold">{cleanerCount}+</span>
                    <span className="text-blue-200">Cleaners</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{avgRating.toFixed(1)}</span>
                    <span className="text-blue-200">Avg Rating</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-6 w-6" />
                    <span className="text-blue-200">{city.county} County</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={`/search?location=${encodeURIComponent(city.name)}`}
                    className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                  >
                    Find Cleaners in {city.name}
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/quote-request"
                    className="inline-flex items-center gap-2 border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
                  >
                    Get Free Quotes
                  </Link>
                </div>
              </div>

              {/* Trust Signals */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
                <h2 className="text-xl font-semibold mb-6">Why Choose Boss of Clean?</h2>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Verified Professionals</p>
                      <p className="text-sm text-blue-200">
                        All cleaners are background-checked and insured
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Instant Booking</p>
                      <p className="text-sm text-blue-200">
                        Book online in minutes, no phone calls needed
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Star className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Satisfaction Guaranteed</p>
                      <p className="text-sm text-blue-200">
                        Read real reviews from local customers
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Phone className="h-6 w-6 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Local Support</p>
                      <p className="text-sm text-blue-200">
                        Florida-based team ready to help
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
              Cleaning Services Available in {city.name}
            </h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              Our verified cleaning professionals offer a wide range of services to meet
              your needs in {city.name} and surrounding {city.county} County areas.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topServices.length > 0
                ? topServices.map((service) => {
                    const serviceInfo = SERVICE_DESCRIPTIONS[service];
                    return (
                      <div
                        key={service}
                        className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Sparkles className="h-6 w-6 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">
                            {serviceInfo?.title || service}
                          </h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">
                          {serviceInfo?.description ||
                            `Professional ${service.toLowerCase()} services in ${city.name}.`}
                        </p>
                        <Link
                          href={`/search?location=${encodeURIComponent(city.name)}&service=${encodeURIComponent(service)}`}
                          className="text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1"
                        >
                          Find {service} Pros
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    );
                  })
                : Object.entries(SERVICE_DESCRIPTIONS)
                    .slice(0, 6)
                    .map(([service, info]) => (
                      <div
                        key={service}
                        className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Sparkles className="h-6 w-6 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">{info.title}</h3>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">{info.description}</p>
                        <Link
                          href={`/search?location=${encodeURIComponent(city.name)}&service=${encodeURIComponent(service)}`}
                          className="text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1"
                        >
                          Find {service} Pros
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
            </div>
          </div>
        </section>

        {/* Featured Cleaners */}
        {cleaners && cleaners.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
                Top-Rated Cleaners in {city.name}
              </h2>
              <p className="text-gray-600 text-center mb-12">
                Browse our highest-rated cleaning professionals serving {city.name} and
                nearby areas.
              </p>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cleaners.map((cleaner: CityPageCleaner) => (
                  <Link
                    key={cleaner.id}
                    href={`/cleaner/${cleaner.business_slug || cleaner.id}`}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="relative w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                        {cleaner.profile_image_url ? (
                          <Image
                            src={cleaner.profile_image_url}
                            alt={cleaner.business_name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl font-bold">
                            {cleaner.business_name?.charAt(0) || 'C'}
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold text-gray-900">
                          {cleaner.business_name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">
                            {(cleaner.average_rating || 0).toFixed(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({cleaner.total_reviews || 0} reviews)
                          </span>
                        </div>
                        {cleaner.instant_booking && (
                          <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Instant Booking
                          </span>
                        )}
                      </div>
                    </div>
                    {cleaner.services && cleaner.services.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1">
                        {cleaner.services.slice(0, 3).map((service: string) => (
                          <span
                            key={service}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              <div className="text-center mt-8">
                <Link
                  href={`/search?location=${encodeURIComponent(city.name)}`}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  View All {cleanerCount} Cleaners in {city.name}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Nearby Cities */}
        {nearbyCities.length > 0 && (
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
                Cleaning Services in Nearby Cities
              </h2>
              <p className="text-gray-600 text-center mb-8">
                Explore cleaning professionals in areas near {city.name}.
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {nearbyCities.map((nearbyCity) => (
                  <Link
                    key={nearbyCity.slug}
                    href={`/${nearbyCity.slug}`}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{nearbyCity.name}</p>
                      <p className="text-sm text-gray-500">{nearbyCity.county} County</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* All Florida Cities Link */}
              <div className="mt-8 text-center">
                <p className="text-gray-600 mb-4">
                  Looking for cleaners in other Florida cities?
                </p>
                <Link
                  href="/search"
                  className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                >
                  Browse All Florida Locations
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Find Your Perfect Cleaner in {city.name}?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Compare quotes from top-rated professionals in {city.county} County.
              Book online in minutes!
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href={`/search?location=${encodeURIComponent(city.name)}`}
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-blue-50 transition text-lg"
              >
                Search Cleaners Now
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/quote-request"
                className="inline-flex items-center gap-2 border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white/10 transition text-lg"
              >
                Get Free Quotes
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
