import { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { getAllServiceTypeSlugs } from '@/lib/data/service-types';
import { getAllCitySlugs } from '@/lib/data/florida-cities';

const logger = createLogger({ file: 'app/sitemap' });
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bossofclean.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${BASE_URL}/search`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${BASE_URL}/professionals`, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${BASE_URL}/pricing`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE_URL}/how-pricing-works`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/how-it-works`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/quote-request`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly' as const, priority: 0.5 },
  ].map((p) => ({ ...p, lastModified: now }));

  // Service landing pages — real slugs (/services/{slug})
  const servicePages: MetadataRoute.Sitemap = getAllServiceTypeSlugs().map((slug) => ({
    url: `${BASE_URL}/services/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // City landing pages — root-level (/{slug})
  const cityPages: MetadataRoute.Sitemap = getAllCitySlugs().map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Cleaner profile pages — real route is /cleaner/{business_slug} (singular)
  let cleanerPages: MetadataRoute.Sitemap = [];
  try {
    const { data: cleaners } = await supabase
      .from('pros')
      .select('business_slug, updated_at')
      .eq('approval_status', 'approved')
      .not('business_slug', 'is', null);

    if (cleaners) {
      cleanerPages = cleaners.map((cleaner) => ({
        url: `${BASE_URL}/cleaner/${cleaner.business_slug}`,
        lastModified: cleaner.updated_at ? new Date(cleaner.updated_at) : now,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch (error) {
    logger.error('Error fetching cleaners for sitemap', { function: 'sitemap' }, error);
  }

  return [...staticPages, ...servicePages, ...cityPages, ...cleanerPages];
}
