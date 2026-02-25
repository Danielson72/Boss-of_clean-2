'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User, MapPin, ArrowRight } from 'lucide-react';

export interface ProviderCardProps {
  id: string;
  businessName: string;
  businessSlug?: string;
  businessDescription?: string;
  profileImageUrl?: string;
  services: string[];
  city?: string;
  state?: string;
  distance?: number;
}

export function ProviderCard({
  id,
  businessName,
  businessSlug,
  businessDescription,
  profileImageUrl,
  services,
  city,
  state,
  distance,
}: ProviderCardProps) {
  const profileUrl = `/cleaner/${businessSlug || id}`;

  return (
    <div className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-brand-gold/40 hover:shadow-lg transition-all duration-300">
      {/* Profile Photo */}
      <Link href={profileUrl} className="block" aria-label={`View ${businessName} profile`}>
        <div className="relative h-48 bg-brand-cream overflow-hidden">
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={`${businessName} profile photo`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="h-16 w-16 text-gray-300" />
            </div>
          )}
        </div>
      </Link>

      <div className="p-5">
        {/* Business Name */}
        <Link href={profileUrl} className="group/name">
          <h3 className="font-display text-lg font-bold text-brand-dark group-hover/name:text-brand-gold transition-colors mb-1">
            {businessName}
          </h3>
        </Link>

        {/* Location */}
        {(city || distance !== undefined) && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            {city && <span>{city}{state ? `, ${state}` : ''}</span>}
            {distance !== undefined && (
              <span className="text-gray-400">
                {city ? ' \u00B7 ' : ''}{distance.toFixed(1)} mi away
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
          {businessDescription || 'Professional cleaning services'}
        </p>

        {/* Services Tags */}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {services.slice(0, 3).map((service, index) => (
              <span
                key={index}
                className="px-2.5 py-1 bg-brand-cream text-brand-dark text-xs font-medium rounded-full"
              >
                {service}
              </span>
            ))}
            {services.length > 3 && (
              <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                +{services.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Action Button */}
        <Link
          href={profileUrl}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-brand-dark text-white rounded-xl font-semibold text-sm hover:bg-brand-navy transition-colors group/btn min-h-[44px]"
        >
          View Profile
          <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

export function ProviderCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="h-48 bg-gray-100 animate-pulse" />
      <div className="p-5 space-y-3">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 w-20 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="h-11 w-full bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}
