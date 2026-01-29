import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger({ file: 'app/sitemap' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

// Service types for dynamic pages
const SERVICE_TYPES = [
  'residential',
  'commercial',
  'deep-cleaning',
  'move-in-out',
  'pressure-washing',
  'carpet-cleaning',
  'window-cleaning',
  'post-construction',
];

// Florida counties for landing pages
const FLORIDA_COUNTIES = [
  'miami-dade',
  'broward',
  'palm-beach',
  'hillsborough',
  'orange',
  'duval',
  'pinellas',
  'lee',
  'polk',
  'brevard',
  'volusia',
  'pasco',
  'seminole',
  'sarasota',
  'manatee',
  'collier',
  'marion',
  'lake',
  'osceola',
  'escambia',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient();

  // Static pages with their priorities
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/quote-request`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Service type pages
  const servicePages: MetadataRoute.Sitemap = SERVICE_TYPES.map((service) => ({
    url: `${BASE_URL}/services/${service}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // County landing pages
  const countyPages: MetadataRoute.Sitemap = FLORIDA_COUNTIES.map((county) => ({
    url: `${BASE_URL}/cleaners/${county}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Dynamic cleaner profile pages
  let cleanerPages: MetadataRoute.Sitemap = [];

  try {
    const { data: cleaners } = await supabase
      .from('cleaners')
      .select('business_slug, updated_at')
      .eq('approval_status', 'approved')
      .not('business_slug', 'is', null);

    if (cleaners) {
      cleanerPages = cleaners.map((cleaner) => ({
        url: `${BASE_URL}/cleaners/${cleaner.business_slug}`,
        lastModified: cleaner.updated_at ? new Date(cleaner.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch (error) {
    logger.error('Error fetching cleaners for sitemap', { function: 'sitemap' }, error);
  }

  // Dynamic city pages based on service areas
  let cityPages: MetadataRoute.Sitemap = [];

  try {
    const { data: cities } = await supabase
      .from('service_areas')
      .select('city, county')
      .not('city', 'is', null);

    if (cities) {
      // Get unique city slugs
      const uniqueCities = new Map<string, { city: string; county: string | null }>();
      cities.forEach((area) => {
        const slug = area.city.toLowerCase().replace(/\s+/g, '-');
        if (!uniqueCities.has(slug)) {
          uniqueCities.set(slug, area);
        }
      });

      cityPages = Array.from(uniqueCities.entries()).map(([slug]) => ({
        url: `${BASE_URL}/cleaners/city/${slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (error) {
    logger.error('Error fetching cities for sitemap', { function: 'sitemap' }, error);
  }

  return [
    ...staticPages,
    ...servicePages,
    ...countyPages,
    ...cleanerPages,
    ...cityPages,
  ];
}
