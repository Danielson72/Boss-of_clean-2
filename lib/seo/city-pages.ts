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

  const title = `Residential and Commercial Services in ${city.name}, FL`;
  const description = `Find residential & commercial service pros in ${city.name}, Florida — cleaning, office cleaning, handyman, pressure washing, landscaping and more. Free to request quotes. No subscriptions. Pros pay $30 flat only when you accept.`;

  return {
    title,
    description,
    // Thin/zero-coverage cities are kept out of the index until a pro serves
    // the area (still crawlable so the recruitment CTA can be discovered).
    robots: cleanerCount === 0 ? { index: false, follow: true } : undefined,
    keywords: [
      `cleaning services ${city.name}`,
      `house cleaning ${city.name} FL`,
      `maid service ${city.name}`,
      `residential cleaning ${city.name}`,
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
 * Generate JSON-LD structured data for a city page.
 *
 * Boss of Clean is a neutral marketplace, not a LocalBusiness operating in each
 * city, so a city page is modeled as a `Service` (home services scoped to the
 * city) provided by the Organization — mirroring generateServiceSchema in
 * lib/seo/json-ld.ts. No AggregateRating is emitted here: the only rating data
 * that belongs in structured markup is a real per-pro review count, which lives
 * on individual pro profiles (generateCleanerSchema), never a city-level count.
 */
export function generateCityJsonLd(data: CityPageData): object {
  const { city, topServices } = data;

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/${city.slug}#service`,
    name: `Residential & Commercial Services in ${city.name}, Florida`,
    description: `Connect with independent residential & commercial service pros in ${city.name}, ${city.county} County, Florida — cleaning, pressure washing, landscaping, pool care and more.`,
    url: `${SITE_URL}/${city.slug}`,
    serviceType: topServices,
    provider: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Boss of Clean',
    },
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

export interface CityFaq {
  question: string;
  answer: string;
}

/**
 * Shared 4-question FAQ template for city pages. Honest, neutral-marketplace:
 * general cost framing (never a Boss of Clean price promise), the free/$30
 * model, how it works, and the independent-pro disclaimer.
 */
export function generateCityFaqs(city: FloridaCity): CityFaq[] {
  return [
    {
      question: `How much do residential & commercial services cost in ${city.name}?`,
      answer: `Prices vary by the job, your property, and the pro you choose. Boss of Clean isn't a service company and doesn't set prices — each pro quotes their own. Requesting quotes is free, so you can compare a few before you decide.`,
    },
    {
      question: `Is Boss of Clean free for customers in ${city.name}?`,
      answer: `Yes. Requesting quotes is always free and there's no subscription. Pros pay a flat $30 only after you accept their quote.`,
    },
    {
      question: `How does Boss of Clean work in ${city.name}?`,
      answer: `Tell us what you need, local ${city.name} pros respond with quotes, and you choose who to hire and pay them directly.`,
    },
    {
      question: `Are the pros on Boss of Clean independent?`,
      answer: `Yes. Boss of Clean is a neutral marketplace of independent residential & commercial service pros. We don't employ, supervise, or control them — hiring decisions are yours.`,
    },
  ];
}

/**
 * FAQPage JSON-LD for city pages, built from the shared template.
 */
export function generateCityFaqJsonLd(city: FloridaCity): object {
  const faqs = generateCityFaqs(city);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
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
  'Pool Cleaning': {
    title: 'Pool Cleaning & Maintenance',
    description: 'Professional pool cleaning and maintenance to keep your pool sparkling and swim-ready.',
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
