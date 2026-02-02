'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Star, DollarSign, Award, Shield, BadgeCheck,
  CheckCircle2, MessageSquare, Phone, User
} from 'lucide-react';
import { getCleanerBadges, type EarnedBadge } from '@/lib/services/badges';
import { CompactBadgeDisplay } from '@/components/badges/BadgeDisplay';

export interface CleanerCardProps {
  id: string;
  businessName: string;
  businessSlug?: string;
  businessDescription?: string;
  profileImageUrl?: string;
  averageRating: number;
  totalReviews: number;
  services: string[];
  hourlyRate: number;
  minimumHours: number;
  yearsExperience: number;
  city?: string;
  state?: string;
  subscriptionTier: string;
  insuranceVerified: boolean;
  licenseVerified: boolean;
  backgroundCheckVerified?: boolean;
  isCertified?: boolean;
  instantBooking?: boolean;
  businessPhone?: string;
  responseTimeHours?: number;
  onRequestQuote?: (cleanerId: string) => void;
}

export function CleanerCard({
  id,
  businessName,
  businessSlug,
  businessDescription,
  profileImageUrl,
  averageRating,
  totalReviews,
  services,
  hourlyRate,
  minimumHours,
  yearsExperience,
  city,
  state,
  subscriptionTier,
  insuranceVerified,
  licenseVerified,
  backgroundCheckVerified,
  isCertified,
  instantBooking,
  businessPhone,
  responseTimeHours,
  onRequestQuote
}: CleanerCardProps) {
  // Calculate badges for this cleaner
  const earnedBadges = getCleanerBadges({
    id,
    average_rating: averageRating,
    total_reviews: totalReviews,
    insurance_verified: insuranceVerified,
    license_verified: licenseVerified,
    response_time_hours: responseTimeHours,
  });

  const getTierBadge = (tier: string) => {
    const tierOptions: Record<string, { color: string; text: string }> = {
      'enterprise': { color: 'bg-yellow-100 text-yellow-800', text: 'Enterprise' },
      'pro': { color: 'bg-purple-100 text-purple-800', text: 'Pro' },
      'basic': { color: 'bg-blue-100 text-blue-800', text: 'Basic' },
      'free': { color: 'bg-gray-100 text-gray-800', text: 'Basic' }
    };
    return tierOptions[tier] || tierOptions.free;
  };

  const tierBadge = getTierBadge(subscriptionTier);
  const profileUrl = `/cleaner/${businessSlug || id}`;

  const handleRequestQuote = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRequestQuote) {
      onRequestQuote(id);
    } else {
      window.location.href = `/quote-request?cleaner=${id}`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-300">
      {/* Profile Photo */}
      <Link href={profileUrl} className="block" aria-label={`View ${businessName} profile`}>
        <div className="relative h-48 bg-gray-200 rounded-t-lg overflow-hidden">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={`${businessName} - Professional cleaning service profile photo`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" aria-label={`${businessName} - No profile photo available`}>
              <User className="h-16 w-16 text-gray-400" aria-hidden="true" />
            </div>
          )}

          {/* Tier Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${tierBadge.color}`}
              aria-label={`${tierBadge.text} subscription tier`}
            >
              {tierBadge.text}
            </span>
          </div>

          {/* Certified Badge Overlay */}
          {isCertified && (
            <div className="absolute top-3 left-3">
              <div
                className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                role="status"
                aria-label="Boss of Clean Certified cleaner"
              >
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                CERTIFIED
              </div>
            </div>
          )}
        </div>
      </Link>

      <div className="p-6">
        {/* Business Name & Rating */}
        <div className="flex justify-between items-start mb-2">
          <Link href={profileUrl} className="hover:text-blue-600">
            <h3 className="text-lg font-semibold text-gray-900">
              {businessName}
            </h3>
          </Link>
          <div className="flex items-center gap-1" aria-label={`Rating: ${(averageRating || 0).toFixed(1)} out of 5 stars from ${totalReviews || 0} reviews`}>
            <Star className="h-4 w-4 text-yellow-500 fill-current" aria-hidden="true" />
            <span className="text-sm font-medium">
              {(averageRating || 0).toFixed(1)}
            </span>
            <span className="text-sm text-gray-600">
              ({totalReviews || 0})
            </span>
          </div>
        </div>

        {/* Achievement Badges */}
        {earnedBadges.length > 0 && (
          <div className="mb-3">
            <CompactBadgeDisplay badges={earnedBadges} />
          </div>
        )}

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {businessDescription || 'Professional cleaning services'}
        </p>

        {/* Key Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>${hourlyRate || 50}/hour ({minimumHours || 2}hr min)</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Award className="h-4 w-4 text-gray-400" aria-hidden="true" />
            <span>{yearsExperience || 0} years experience</span>
          </div>

          {/* Certification or Individual Verifications */}
          {isCertified ? (
            <div className="bg-gradient-to-r from-green-100 to-green-50 border border-green-300 rounded-lg p-3 mb-2" role="status">
              <div className="flex items-center gap-2 text-sm font-bold">
                <BadgeCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
                <span className="text-green-800">Boss of Clean Certified</span>
              </div>
              <p className="text-xs text-green-700 mt-1">Background checked, insured & verified</p>
            </div>
          ) : (
            <div className="space-y-1" role="list" aria-label="Verifications">
              {insuranceVerified && (
                <div className="flex items-center gap-2 text-xs" role="listitem">
                  <Shield className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                  <span className="text-gray-600">Insured</span>
                </div>
              )}
              {backgroundCheckVerified && (
                <div className="flex items-center gap-2 text-xs" role="listitem">
                  <BadgeCheck className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                  <span className="text-gray-600">Background Checked</span>
                </div>
              )}
              {licenseVerified && (
                <div className="flex items-center gap-2 text-xs" role="listitem">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                  <span className="text-gray-600">Licensed</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Services */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1" role="list" aria-label="Services offered">
            {(services || []).slice(0, 3).map((service, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                role="listitem"
              >
                {service}
              </span>
            ))}
            {(services || []).length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full" role="listitem">
                +{services.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2" role="group" aria-label="Actions">
          {instantBooking ? (
            <Link
              href={`/book/${id}`}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition duration-300 text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              aria-label={`Book ${businessName} now`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Book Now
            </Link>
          ) : (
            <button
              onClick={handleRequestQuote}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300 text-sm font-medium flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Request a quote from ${businessName}`}
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Request Quote
            </button>
          )}
          {businessPhone && (
            <a
              href={`tel:${businessPhone}`}
              className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label={`Call ${businessName} at ${businessPhone}`}
            >
              <Phone className="h-4 w-4 text-gray-600" aria-hidden="true" />
            </a>
          )}
          <Link
            href={profileUrl}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition duration-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`View ${businessName} full profile`}
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}

// Skeleton loading state
export function CleanerCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="h-48 bg-gray-200 rounded-t-lg animate-pulse" />
      <div className="p-6 space-y-3">
        <div className="flex justify-between">
          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-1">
          <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="flex gap-2 pt-2">
          <div className="h-10 flex-1 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
