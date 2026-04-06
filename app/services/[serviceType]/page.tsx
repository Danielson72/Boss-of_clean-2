import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  SERVICE_TYPES,
  getServiceTypeBySlug,
  getAllServiceTypeSlugs
} from '@/lib/data/service-types';
import {
  generateServicePageMetadata,
  generateServicePageJsonLd
} from '@/lib/seo/service-pages';
import { ServicePageClient } from './ServicePageClient';

interface ServicePageProps {
  params: Promise<{ serviceType: string }>;
}

// Dynamic rendering — pages render on-demand (SSR), not at build time.
// Avoids Next.js 13.5 experimental server actions runtime crash during SSG.
export const dynamic = 'force-dynamic';

/**
 * Generate metadata for the page
 */
export async function generateMetadata({
  params
}: ServicePageProps): Promise<Metadata> {
  const { serviceType: slug } = await params;
  const serviceType = getServiceTypeBySlug(slug);

  if (!serviceType) {
    return {
      title: 'Service Not Found | Boss of Clean',
      description: 'The requested cleaning service could not be found.',
    };
  }

  return generateServicePageMetadata(serviceType);
}

/**
 * Service type landing page
 * Server component that handles data fetching and passes to client component
 */
export default async function ServicePage({ params }: ServicePageProps) {
  const { serviceType: slug } = await params;
  const serviceType = getServiceTypeBySlug(slug);

  if (!serviceType) {
    notFound();
  }

  // Generate JSON-LD structured data
  const jsonLd = generateServicePageJsonLd(serviceType);

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd.replace(/</g, '\\u003c') }}
      />

      {/* Client component handles data fetching and interactivity */}
      <ServicePageClient serviceType={serviceType} />
    </>
  );
}

/**
 * Revalidate the page every 1 hour
 */
export const revalidate = 3600;
