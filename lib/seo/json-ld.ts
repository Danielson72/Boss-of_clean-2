/**
 * JSON-LD Structured Data Generators
 * Schema.org markup for SEO
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

// Type definitions for cleaner data
export interface CleanerProfile {
  id: string;
  business_name: string;
  business_description?: string | null;
  business_phone?: string | null;
  business_email?: string | null;
  website_url?: string | null;
  business_slug?: string | null;
  hourly_rate?: number | null;
  services?: string[] | null;
  service_areas?: string[] | null;
  average_rating?: number | null;
  total_reviews?: number | null;
  years_experience?: number | null;
  insurance_verified?: boolean;
  license_verified?: boolean;
  profile_image_url?: string | null;
}

export interface ServiceAreaInfo {
  city: string;
  county?: string | null;
  zip_code?: string;
}

/**
 * Organization schema for the Boss of Clean brand
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: 'Boss of Clean',
    alternateName: 'Boss of Clean Florida',
    description: 'Florida\'s premier cleaning service directory. Find professional cleaners across all 67 Florida counties. Purrfection is our Standard.',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    image: `${BASE_URL}/og-image.png`,
    sameAs: [
      'https://www.facebook.com/bossofclean',
      'https://www.instagram.com/bossofclean',
      'https://twitter.com/bossofclean',
    ],
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'FL',
      addressCountry: 'US',
    },
    areaServed: {
      '@type': 'State',
      name: 'Florida',
      containedInPlace: {
        '@type': 'Country',
        name: 'United States',
      },
    },
    slogan: 'Purrfection is our Standard',
    knowsAbout: [
      'Residential Cleaning',
      'Commercial Cleaning',
      'Deep Cleaning',
      'Move-in/Move-out Cleaning',
      'Pressure Washing',
      'Carpet Cleaning',
      'Window Cleaning',
    ],
  };
}

/**
 * WebSite schema for search functionality
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: 'Boss of Clean',
    url: BASE_URL,
    description: 'Find professional cleaning services in Florida instantly. 500+ cleaning professionals across all 67 counties.',
    publisher: {
      '@id': `${BASE_URL}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * LocalBusiness/ProfessionalService schema for cleaner profiles
 */
export function generateCleanerSchema(cleaner: CleanerProfile, serviceArea?: ServiceAreaInfo) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    '@id': `${BASE_URL}/cleaners/${cleaner.business_slug || cleaner.id}`,
    name: cleaner.business_name,
    description: cleaner.business_description || `Professional cleaning services by ${cleaner.business_name}`,
    url: `${BASE_URL}/cleaners/${cleaner.business_slug || cleaner.id}`,
    priceRange: cleaner.hourly_rate ? `$${cleaner.hourly_rate}/hour` : '$$',
    currenciesAccepted: 'USD',
    paymentAccepted: 'Cash, Credit Card',
  };

  // Add image if available
  if (cleaner.profile_image_url) {
    schema.image = cleaner.profile_image_url;
  }

  // Add contact info (only if provided)
  if (cleaner.business_phone) {
    schema.telephone = cleaner.business_phone;
  }

  if (cleaner.business_email) {
    schema.email = cleaner.business_email;
  }

  if (cleaner.website_url) {
    schema.sameAs = cleaner.website_url;
  }

  // Add address if service area info provided
  if (serviceArea) {
    schema.address = {
      '@type': 'PostalAddress',
      addressLocality: serviceArea.city,
      addressRegion: 'FL',
      addressCountry: 'US',
      ...(serviceArea.county && { addressRegion: `${serviceArea.county}, FL` }),
      ...(serviceArea.zip_code && { postalCode: serviceArea.zip_code }),
    };
  } else {
    schema.address = {
      '@type': 'PostalAddress',
      addressRegion: 'FL',
      addressCountry: 'US',
    };
  }

  // Add aggregate rating if available
  if (cleaner.average_rating && cleaner.total_reviews && cleaner.total_reviews > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: cleaner.average_rating,
      reviewCount: cleaner.total_reviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  // Add services offered
  if (cleaner.services && cleaner.services.length > 0) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Cleaning Services',
      itemListElement: cleaner.services.map((service, index) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: formatServiceName(service),
        },
        position: index + 1,
      })),
    };
  }

  // Add verification badges
  const additionalProperties: Array<{ '@type': string; name: string; value: string }> = [];
  if (cleaner.insurance_verified) {
    additionalProperties.push({
      '@type': 'PropertyValue',
      name: 'Insurance',
      value: 'Verified',
    });
  }
  if (cleaner.license_verified) {
    additionalProperties.push({
      '@type': 'PropertyValue',
      name: 'License',
      value: 'Verified',
    });
  }
  if (cleaner.years_experience) {
    additionalProperties.push({
      '@type': 'PropertyValue',
      name: 'Years in Business',
      value: `${cleaner.years_experience} years`,
    });
  }
  if (additionalProperties.length > 0) {
    schema.additionalProperty = additionalProperties;
  }

  // Area served
  if (cleaner.service_areas && cleaner.service_areas.length > 0) {
    schema.areaServed = cleaner.service_areas.slice(0, 10).map((area) => ({
      '@type': 'City',
      name: area,
      containedInPlace: {
        '@type': 'State',
        name: 'Florida',
      },
    }));
  }

  return schema;
}

/**
 * Service schema for cleaning service pages
 */
export function generateServiceSchema(
  serviceName: string,
  serviceSlug: string,
  description: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${BASE_URL}/services/${serviceSlug}`,
    name: serviceName,
    description: description,
    provider: {
      '@id': `${BASE_URL}/#organization`,
    },
    areaServed: {
      '@type': 'State',
      name: 'Florida',
      containedInPlace: {
        '@type': 'Country',
        name: 'United States',
      },
    },
    serviceType: serviceName,
  };
}

/**
 * BreadcrumbList schema for navigation paths
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * FAQPage schema for FAQ sections
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
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
 * ItemList schema for cleaner listings
 */
export function generateCleanerListSchema(
  cleaners: CleanerProfile[],
  listName: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    numberOfItems: cleaners.length,
    itemListElement: cleaners.map((cleaner, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'LocalBusiness',
        name: cleaner.business_name,
        url: `${BASE_URL}/cleaners/${cleaner.business_slug || cleaner.id}`,
        ...(cleaner.average_rating && cleaner.total_reviews && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: cleaner.average_rating,
            reviewCount: cleaner.total_reviews,
          },
        }),
      },
    })),
  };
}

// Helper function to format service names
function formatServiceName(service: string): string {
  return service
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
