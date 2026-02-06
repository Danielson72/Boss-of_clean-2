import { Metadata } from 'next';
import { FloridaCity } from '@/lib/data/florida-cities';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export interface CityPageData {
  city: FloridaCity;
  cleanerCount: number;
  averageRating: number;
  topServices: string[];
}

/**
 * Generate SEO metadata for a city landing page
 */
export function generateCityMetadata(data: CityPageData): Metadata {
  const { city, cleanerCount, averageRating } = data;

  const title = `House Cleaning Services in ${city.name}, FL | Boss of Clean`;
  const description = `Find ${cleanerCount}+ verified cleaning professionals in ${city.name}, Florida. Average ${averageRating.toFixed(1)}-star rating. Residential & commercial cleaning, deep cleaning, move-in/out cleaning. Book instantly!`;

  return {
    title,
    description,
    keywords: [
      `cleaning services ${city.name}`,
      `house cleaning ${city.name} FL`,
      `maid service ${city.name}`,
      `commercial cleaning ${city.name}`,
      `${city.name} cleaning company`,
      `deep cleaning ${city.name}`,
      `move in cleaning ${city.name}`,
      `residential cleaning ${city.county} County`,
    ].join(', '),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${city.slug}`,
      siteName: 'Boss of Clean',
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `Cleaning Services in ${city.name}, Florida`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${SITE_URL}/${city.slug}`,
    },
  };
}

/**
 * Generate JSON-LD structured data for a city page
 */
export function generateCityJsonLd(data: CityPageData): object {
  const { city, cleanerCount, averageRating, topServices } = data;

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/${city.slug}`,
    name: `Boss of Clean - ${city.name}`,
    description: `Professional cleaning services in ${city.name}, ${city.county} County, Florida. ${cleanerCount}+ cleaning professionals available.`,
    url: `${SITE_URL}/${city.slug}`,
    areaServed: {
      '@type': 'City',
      name: city.name,
      containedInPlace: {
        '@type': 'State',
        name: 'Florida',
        containedInPlace: {
          '@type': 'Country',
          name: 'United States',
        },
      },
    },
    aggregateRating: cleanerCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: averageRating.toFixed(1),
      reviewCount: cleanerCount,
      bestRating: '5',
      worstRating: '1',
    } : undefined,
    serviceType: topServices,
    priceRange: '$$',
  };
}

/**
 * Generate breadcrumb JSON-LD for city pages
 */
export function generateBreadcrumbJsonLd(city: FloridaCity): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Florida',
        item: `${SITE_URL}/search`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: city.name,
        item: `${SITE_URL}/${city.slug}`,
      },
    ],
  };
}

/**
 * Service types with descriptions for city pages
 */
export const SERVICE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  'House Cleaning': {
    title: 'Residential House Cleaning',
    description: 'Regular home cleaning services including dusting, vacuuming, mopping, and bathroom sanitization.',
  },
  'Deep Cleaning': {
    title: 'Deep Cleaning Services',
    description: 'Thorough cleaning reaching every corner, including baseboards, inside appliances, and detailed scrubbing.',
  },
  'Move-in/Move-out Cleaning': {
    title: 'Move-In/Move-Out Cleaning',
    description: 'Complete cleaning for empty homes ensuring properties are spotless for new occupants.',
  },
  'Office Cleaning': {
    title: 'Commercial Office Cleaning',
    description: 'Professional cleaning for offices and commercial spaces, available daily, weekly, or monthly.',
  },
  'Carpet Cleaning': {
    title: 'Carpet & Upholstery Cleaning',
    description: 'Deep carpet cleaning using professional equipment to remove stains and allergens.',
  },
  'Pressure Washing': {
    title: 'Pressure Washing Services',
    description: 'High-pressure cleaning for driveways, patios, decks, and exterior surfaces.',
  },
  'Window Cleaning': {
    title: 'Window Cleaning',
    description: 'Interior and exterior window cleaning for crystal-clear, streak-free results.',
  },
  'Post-Construction Cleaning': {
    title: 'Post-Construction Cleaning',
    description: 'Specialized cleaning after renovation or construction to remove dust and debris.',
  },
};

/**
 * Get region display name
 */
export function getRegionDisplayName(region: FloridaCity['region']): string {
  const names: Record<FloridaCity['region'], string> = {
    south: 'South Florida',
    central: 'Central Florida',
    north: 'North Florida',
    panhandle: 'Florida Panhandle',
  };
  return names[region];
}
