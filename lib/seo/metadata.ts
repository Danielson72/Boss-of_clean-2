/**
 * SEO Metadata Generators
 * Reusable helpers for generating page metadata
 */

import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';
const SITE_NAME = 'Boss of Clean';
const DEFAULT_DESCRIPTION = 'Find professional cleaning services in Florida instantly. 500+ cleaning professionals across all 67 counties. Residential, commercial, deep cleaning, pressure washing & more.';

export interface MetadataOptions {
  title: string;
  description?: string;
  keywords?: string[];
  path?: string;
  image?: string;
  noIndex?: boolean;
  type?: 'website' | 'article' | 'profile';
}

/**
 * Generate complete metadata for a page
 */
export function generatePageMetadata(options: MetadataOptions): Metadata {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = [],
    path = '',
    image = '/og-image.png',
    noIndex = false,
    type = 'website',
  } = options;

  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = `${BASE_URL}${path}`;
  const imageUrl = image.startsWith('http') ? image : `${BASE_URL}${image}`;

  const defaultKeywords = [
    'cleaning services Florida',
    'house cleaning',
    'commercial cleaning',
    'professional cleaners',
    'Boss of Clean',
  ];

  return {
    title: fullTitle,
    description,
    keywords: [...defaultKeywords, ...keywords].join(', '),
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: 'en_US',
      type,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [imageUrl],
      creator: '@bossofclean',
    },
  };
}

/**
 * Generate metadata for cleaner profile pages
 */
export function generateCleanerMetadata(cleaner: {
  business_name: string;
  business_description?: string | null;
  business_slug?: string | null;
  average_rating?: number | null;
  total_reviews?: number | null;
  services?: string[] | null;
  service_areas?: string[] | null;
  profile_image_url?: string | null;
}): Metadata {
  const title = `${cleaner.business_name} - Professional Cleaning Services`;

  let description = cleaner.business_description || `Professional cleaning services by ${cleaner.business_name}.`;

  // Add rating info if available
  if (cleaner.average_rating && cleaner.total_reviews) {
    description += ` Rated ${cleaner.average_rating.toFixed(1)}/5 based on ${cleaner.total_reviews} reviews.`;
  }

  // Add service areas
  if (cleaner.service_areas && cleaner.service_areas.length > 0) {
    const areas = cleaner.service_areas.slice(0, 3).join(', ');
    description += ` Serving ${areas}, Florida.`;
  }

  // Truncate if too long
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }

  const keywords = [
    cleaner.business_name,
    ...(cleaner.services || []),
    ...(cleaner.service_areas?.slice(0, 5) || []),
    'Florida cleaning',
  ];

  return generatePageMetadata({
    title,
    description,
    keywords,
    path: `/cleaners/${cleaner.business_slug || ''}`,
    image: cleaner.profile_image_url || '/og-image.png',
    type: 'profile',
  });
}

/**
 * Generate metadata for service category pages
 */
export function generateServiceMetadata(
  serviceName: string,
  serviceSlug: string,
  customDescription?: string
): Metadata {
  const title = `${serviceName} Services in Florida`;
  const description =
    customDescription ||
    `Find professional ${serviceName.toLowerCase()} services across Florida. Compare prices, read reviews, and book cleaning professionals. Purrfection is our Standard.`;

  return generatePageMetadata({
    title,
    description,
    keywords: [
      serviceName,
      `${serviceName} Florida`,
      `${serviceName} near me`,
      'professional cleaning',
      'cleaning professionals',
    ],
    path: `/services/${serviceSlug}`,
  });
}

/**
 * Generate metadata for location/city pages
 */
export function generateLocationMetadata(
  city: string,
  county?: string,
  cleanerCount?: number
): Metadata {
  const locationStr = county ? `${city}, ${county} County` : city;
  const title = `Cleaning Services in ${locationStr}, Florida`;

  let description = `Find trusted cleaning professionals in ${locationStr}, FL.`;
  if (cleanerCount && cleanerCount > 0) {
    description += ` Browse ${cleanerCount}+ cleaning professionals.`;
  }
  description += ' Compare prices, read reviews, and book today. Purrfection is our Standard.';

  const citySlug = city.toLowerCase().replace(/\s+/g, '-');

  return generatePageMetadata({
    title,
    description,
    keywords: [
      `cleaning services ${city}`,
      `house cleaning ${city}`,
      `cleaners near ${city}`,
      `${city} FL cleaning`,
      ...(county ? [`${county} county cleaning`] : []),
    ],
    path: `/cleaners/city/${citySlug}`,
  });
}

/**
 * Generate metadata for county landing pages
 */
export function generateCountyMetadata(
  county: string,
  cleanerCount?: number
): Metadata {
  const countyName = county
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const title = `Cleaning Services in ${countyName} County, Florida`;

  let description = `Find professional cleaning services in ${countyName} County, FL.`;
  if (cleanerCount && cleanerCount > 0) {
    description += ` ${cleanerCount}+ cleaning professionals available.`;
  }
  description += ' Residential, commercial, and specialty cleaning. Purrfection is our Standard.';

  return generatePageMetadata({
    title,
    description,
    keywords: [
      `${countyName} county cleaning`,
      `cleaning services ${countyName}`,
      `house cleaning ${countyName} county`,
      'Florida cleaning services',
    ],
    path: `/cleaners/${county}`,
  });
}

/**
 * Generate metadata for search results pages
 */
export function generateSearchMetadata(
  query?: string,
  location?: string,
  resultCount?: number
): Metadata {
  let title = 'Find Cleaning Services';
  let description = 'Search for professional cleaning services in Florida.';

  if (query && location) {
    title = `${query} in ${location}`;
    description = `Find ${query.toLowerCase()} services in ${location}, FL.`;
  } else if (query) {
    title = `${query} Services`;
    description = `Find ${query.toLowerCase()} services across Florida.`;
  } else if (location) {
    title = `Cleaning Services in ${location}`;
    description = `Find cleaning services in ${location}, FL.`;
  }

  if (resultCount !== undefined) {
    description += ` ${resultCount} results found.`;
  }

  description += ' Compare prices, read reviews, and book cleaning professionals.';

  return generatePageMetadata({
    title,
    description,
    path: '/search',
    noIndex: true, // Search results typically shouldn't be indexed
  });
}
