import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Image from 'next/image';
import {
  Star, MapPin, Phone, Mail, Globe, Clock, Shield, Award,
  BadgeCheck, CheckCircle2, DollarSign, Users, Calendar,
  MessageSquare, ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { StartConversationButton } from '@/components/messaging/StartConversationButton';
import { PublicGallery, PortfolioPhoto } from '@/components/portfolio/PublicGallery';
import type { BusinessHours } from '@/lib/types/database';

interface CleanerProfile {
  id: string;
  business_name: string;
  business_slug: string;
  business_description: string;
  business_phone: string;
  business_email: string;
  website_url: string;
  services: string[];
  service_areas: string[];
  hourly_rate: number;
  minimum_hours: number;
  years_experience: number;
  employees_count: number;
  average_rating: number;
  total_reviews: number;
  total_jobs: number;
  response_time_hours: number;
  insurance_verified: boolean;
  license_verified: boolean;
  background_check: boolean;
  is_certified: boolean;
  instant_booking: boolean;
  subscription_tier: string;
  profile_image_url: string;
  business_images: string[];
  business_hours: BusinessHours | null;
  created_at: string;
  users: {
    full_name: string;
    city: string;
    state: string;
    zip_code: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  customer_name: string;
  cleaner_response: string | null;
  cleaner_response_at: string | null;
}

async function getCleanerBySlug(slug: string): Promise<CleanerProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cleaners')
    .select(`
      *,
      users!inner(full_name, city, state, zip_code)
    `)
    .eq('business_slug', slug)
    .eq('approval_status', 'approved')
    .single();

  if (error || !data) {
    // Try by ID as fallback
    const { data: dataById, error: errorById } = await supabase
      .from('cleaners')
      .select(`
        *,
        users!inner(full_name, city, state, zip_code)
      `)
      .eq('id', slug)
      .eq('approval_status', 'approved')
      .single();

    if (errorById || !dataById) return null;
    return dataById;
  }

  return data;
}

async function getCleanerReviews(cleanerId: string): Promise<Review[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('reviews')
    .select('id, rating, comment, created_at, customer_name, cleaner_response, cleaner_response_at')
    .eq('cleaner_id', cleanerId)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(10);

  return data || [];
}

async function getCleanerPortfolio(cleanerId: string): Promise<PortfolioPhoto[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('portfolio_photos')
    .select('id, image_url, thumbnail_url, caption, pair_id, photo_type, display_order')
    .eq('cleaner_id', cleanerId)
    .order('display_order', { ascending: true });

  return (data || []) as PortfolioPhoto[];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cleaner = await getCleanerBySlug(slug);

  if (!cleaner) {
    return { title: 'Cleaner Not Found | Boss of Clean' };
  }

  return {
    title: `${cleaner.business_name} | Professional Cleaning Services | Boss of Clean`,
    description: cleaner.business_description || `${cleaner.business_name} offers professional cleaning services in ${cleaner.users?.city || 'Florida'}. ${cleaner.years_experience}+ years experience. Book now!`,
    openGraph: {
      title: cleaner.business_name,
      description: cleaner.business_description,
      images: cleaner.profile_image_url ? [cleaner.profile_image_url] : [],
    },
  };
}

export default async function CleanerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cleaner = await getCleanerBySlug(slug);

  if (!cleaner) {
    notFound();
  }

  const reviews = await getCleanerReviews(cleaner.id);
  const portfolioPhotos = await getCleanerPortfolio(cleaner.id);

  const getTierBadge = (tier: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      'enterprise': { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', text: 'Enterprise Partner' },
      'pro': { color: 'bg-purple-100 text-purple-800 border-purple-300', text: 'Pro Member' },
      'basic': { color: 'bg-blue-100 text-blue-800 border-blue-300', text: 'Basic Member' },
      'free': { color: 'bg-gray-100 text-gray-800 border-gray-300', text: 'Member' }
    };
    return badges[tier] || badges.free;
  };

  const tierBadge = getTierBadge(cleaner.subscription_tier);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/search"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Link>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <div className="relative">
                {cleaner.profile_image_url ? (
                  <Image
                    src={cleaner.profile_image_url}
                    alt={cleaner.business_name}
                    width={160}
                    height={160}
                    sizes="(max-width: 768px) 128px, 160px"
                    className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover shadow-md"
                  />
                ) : (
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl bg-gray-200 flex items-center justify-center">
                    <Users className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                {cleaner.is_certified && (
                  <div className="absolute -bottom-2 -right-2 bg-green-600 text-white p-2 rounded-full">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {cleaner.business_name}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${tierBadge.color}`}>
                  {tierBadge.text}
                </span>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.round(cleaner.average_rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold">{(cleaner.average_rating || 0).toFixed(1)}</span>
                <span className="text-gray-600">({cleaner.total_reviews || 0} reviews)</span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <MapPin className="h-4 w-4" />
                <span>{cleaner.users?.city}, {cleaner.users?.state || 'FL'}</span>
              </div>

              {/* Verification Badges */}
              <div className="flex flex-wrap gap-2">
                {cleaner.is_certified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <BadgeCheck className="h-4 w-4" />
                    Boss of Clean Certified
                  </span>
                )}
                {cleaner.insurance_verified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <Shield className="h-4 w-4" />
                    Insured
                  </span>
                )}
                {cleaner.license_verified && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Licensed
                  </span>
                )}
                {cleaner.background_check && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Background Checked
                  </span>
                )}
              </div>
            </div>

            {/* CTA Section */}
            <div className="flex-shrink-0 w-full md:w-auto">
              <div className="bg-gray-50 rounded-xl p-6 border">
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-gray-900">
                    ${cleaner.hourly_rate || 50}
                  </div>
                  <div className="text-gray-600">per hour</div>
                  <div className="text-sm text-gray-500">
                    {cleaner.minimum_hours || 2} hour minimum
                  </div>
                </div>

                <Link
                  href={`/quote-request?cleaner=${cleaner.id}`}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  Request Quote
                </Link>

                {cleaner.business_phone && (
                  <a
                    href={`tel:${cleaner.business_phone}`}
                    className="w-full mt-3 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2"
                  >
                    <Phone className="h-5 w-5" />
                    Call Now
                  </a>
                )}

                <StartConversationButton
                  cleanerId={cleaner.id}
                  cleanerName={cleaner.business_name}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-600 whitespace-pre-line">
                {cleaner.business_description || 'Professional cleaning services tailored to your needs.'}
              </p>
            </section>

            {/* Services */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Services Offered</h2>
              <div className="flex flex-wrap gap-2">
                {(cleaner.services || []).map((service, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    {service}
                  </span>
                ))}
                {(!cleaner.services || cleaner.services.length === 0) && (
                  <span className="text-gray-500">Contact for available services</span>
                )}
              </div>
            </section>

            {/* Service Areas */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Areas</h2>
              <div className="flex flex-wrap gap-2">
                {(cleaner.service_areas || []).map((area, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {area}
                  </span>
                ))}
                {(!cleaner.service_areas || cleaner.service_areas.length === 0) && (
                  <span className="text-gray-500">Contact for service availability</span>
                )}
              </div>
            </section>

            {/* Portfolio Gallery */}
            {portfolioPhotos.length > 0 && (
              <PublicGallery
                photos={portfolioPhotos}
                businessName={cleaner.business_name}
              />
            )}

            {/* Reviews */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Reviews ({cleaner.total_reviews || 0})
              </h2>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-medium text-sm">{review.customer_name || 'Customer'}</span>
                        <span className="text-gray-400 text-sm">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm">{review.comment}</p>
                      {review.cleaner_response && (
                        <div className="mt-3 ml-4 pl-4 border-l-2 border-blue-200">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-blue-700">Business Response</span>
                            {review.cleaner_response_at && (
                              <span className="text-xs text-gray-400">
                                {new Date(review.cleaner_response_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm">{review.cleaner_response}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No reviews yet. Be the first to leave a review!</p>
              )}
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Facts</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600">{cleaner.years_experience || 0} years experience</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600">{cleaner.employees_count || 1} team member{(cleaner.employees_count || 1) > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600">{cleaner.total_jobs || 0} jobs completed</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-600">Responds in ~{cleaner.response_time_hours || 24} hours</span>
                </div>
                {cleaner.instant_booking && (
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">Instant Booking Available</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                {cleaner.business_phone && (
                  <a
                    href={`tel:${cleaner.business_phone}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-blue-600"
                  >
                    <Phone className="h-5 w-5" />
                    <span>{cleaner.business_phone}</span>
                  </a>
                )}
                {cleaner.business_email && (
                  <a
                    href={`mailto:${cleaner.business_email}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-blue-600"
                  >
                    <Mail className="h-5 w-5" />
                    <span className="truncate">{cleaner.business_email}</span>
                  </a>
                )}
                {cleaner.website_url && (
                  <a
                    href={cleaner.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-600 hover:text-blue-600"
                  >
                    <Globe className="h-5 w-5" />
                    <span className="truncate">Visit Website</span>
                  </a>
                )}
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm text-gray-500">
                Member since {new Date(cleaner.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
