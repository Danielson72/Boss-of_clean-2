'use client';

import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateCleanerSchema,
  generateServiceSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateCleanerListSchema,
  type CleanerProfile,
} from '@/lib/seo';

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Renders JSON-LD structured data script
 */
function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/**
 * Organization + Website schema for homepage
 */
export function HomePageStructuredData() {
  const schemas = [
    generateOrganizationSchema(),
    generateWebsiteSchema(),
  ];

  return <JsonLd data={schemas} />;
}

/**
 * Cleaner profile structured data
 */
export function CleanerProfileStructuredData({
  cleaner,
  serviceArea,
  breadcrumbs,
}: {
  cleaner: CleanerProfile;
  serviceArea?: { city: string; county?: string | null; zip_code?: string };
  breadcrumbs?: Array<{ name: string; url: string }>;
}) {
  const schemas: Record<string, unknown>[] = [
    generateCleanerSchema(cleaner, serviceArea),
  ];

  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(generateBreadcrumbSchema(breadcrumbs));
  }

  return <JsonLd data={schemas} />;
}

/**
 * Service category page structured data
 */
export function ServicePageStructuredData({
  serviceName,
  serviceSlug,
  description,
  breadcrumbs,
}: {
  serviceName: string;
  serviceSlug: string;
  description: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
}) {
  const schemas: Record<string, unknown>[] = [
    generateServiceSchema(serviceName, serviceSlug, description),
  ];

  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(generateBreadcrumbSchema(breadcrumbs));
  }

  return <JsonLd data={schemas} />;
}

/**
 * Cleaner listing page structured data
 */
export function CleanerListingStructuredData({
  cleaners,
  listName,
  breadcrumbs,
}: {
  cleaners: CleanerProfile[];
  listName: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
}) {
  const schemas: Record<string, unknown>[] = [
    generateCleanerListSchema(cleaners, listName),
  ];

  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(generateBreadcrumbSchema(breadcrumbs));
  }

  return <JsonLd data={schemas} />;
}

/**
 * FAQ page structured data
 */
export function FAQStructuredData({
  faqs,
}: {
  faqs: Array<{ question: string; answer: string }>;
}) {
  return <JsonLd data={generateFAQSchema(faqs)} />;
}

/**
 * Breadcrumb structured data
 */
export function BreadcrumbStructuredData({
  items,
}: {
  items: Array<{ name: string; url: string }>;
}) {
  return <JsonLd data={generateBreadcrumbSchema(items)} />;
}

export { JsonLd };
