import type { Metadata } from 'next';
import { ServiceType, getServiceTypeBySlug } from '@/lib/data/service-types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bossofclean.com';

/**
 * Generate metadata for a service type landing page
 */
export function generateServicePageMetadata(serviceType: ServiceType): Metadata {
  const title = `${serviceType.name} in Florida | Boss of Clean`;
  const description = `Find professional ${serviceType.name.toLowerCase()} in Florida. ${serviceType.description} Compare verified cleaners, read reviews, and get free quotes.`;

  return {
    title,
    description,
    keywords: serviceType.keywords.join(', '),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'en_US',
      url: `${SITE_URL}/services/${serviceType.slug}`,
      siteName: 'Boss of Clean',
      images: [
        {
          url: `${SITE_URL}/og-images/services/${serviceType.slug}.png`,
          width: 1200,
          height: 630,
          alt: `${serviceType.name} Services in Florida`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/og-images/services/${serviceType.slug}.png`],
    },
    alternates: {
      canonical: `${SITE_URL}/services/${serviceType.slug}`,
    },
  };
}

/**
 * Generate metadata by slug
 */
export function generateServicePageMetadataBySlug(slug: string): Metadata | null {
  const serviceType = getServiceTypeBySlug(slug);
  if (!serviceType) return null;
  return generateServicePageMetadata(serviceType);
}

/**
 * Generate JSON-LD structured data for service pages
 */
export function generateServiceJsonLd(serviceType: ServiceType): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: serviceType.name,
    description: serviceType.longDescription,
    provider: {
      '@type': 'Organization',
      name: 'Boss of Clean',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      areaServed: {
        '@type': 'State',
        name: 'Florida',
        '@id': 'https://www.wikidata.org/wiki/Q812',
      },
    },
    areaServed: {
      '@type': 'State',
      name: 'Florida',
    },
    serviceType: serviceType.name,
    offers: {
      '@type': 'Offer',
      priceRange: `$${serviceType.priceRange.min} - $${serviceType.priceRange.max}`,
      priceCurrency: 'USD',
    },
    url: `${SITE_URL}/services/${serviceType.slug}`,
  };
}

/**
 * Generate FAQ structured data for service pages
 */
export function generateFaqJsonLd(serviceType: ServiceType): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: serviceType.faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate breadcrumb structured data
 */
export function generateBreadcrumbJsonLd(serviceType: ServiceType): Record<string, unknown> {
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
        name: 'Services',
        item: `${SITE_URL}/services`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: serviceType.name,
        item: `${SITE_URL}/services/${serviceType.slug}`,
      },
    ],
  };
}

/**
 * Generate all JSON-LD data combined for a service page
 */
export function generateServicePageJsonLd(serviceType: ServiceType): string {
  const schemas = [
    generateServiceJsonLd(serviceType),
    generateFaqJsonLd(serviceType),
    generateBreadcrumbJsonLd(serviceType),
  ];

  return JSON.stringify(schemas);
}
