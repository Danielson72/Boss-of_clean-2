import { createPublicClient } from '@/lib/supabase/public';

/**
 * Public-facing service categories for homepage taxonomy (hero dropdown +
 * services grid + stats count). Single source of truth: service_categories.
 *
 * A category is public if it serves residential OR commercial customers.
 * Coverall DLD-256 is cleared (written approval on file), so Commercial Cleaning
 * (supports_residential = false, supports_commercial = true) now surfaces.
 * office_cleaning is held back for now — it folds into Commercial Cleaning as a
 * sub-service pending a taxonomy decision, so it's excluded explicitly here.
 * Aliases are excluded (their canonical rows are included).
 *
 * RLS: reads via the anon-key server client under the public
 * "service_categories: anyone reads active rows" policy.
 */
export interface PublicCategory {
  slug: string;
  display_name: string;
  description: string | null;
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('service_categories')
      .select('slug, display_name, description, supports_residential, supports_commercial, alias_for, priority_order')
      .eq('is_active', true)
      .is('alias_for', null)
      .order('priority_order', { ascending: true, nullsFirst: false });

    if (error || !data) return [];
    return data
      .filter((c) => c.slug !== 'office_cleaning')
      .filter((c) => c.supports_residential !== false || c.supports_commercial === true)
      .map(({ slug, display_name, description }) => ({ slug, display_name, description }));
  } catch {
    // Components fall back to their static lists when this returns [].
    return [];
  }
}
