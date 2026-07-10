import { createClient } from '@/lib/supabase/server';

/**
 * Public-facing service categories for homepage taxonomy (hero dropdown +
 * services grid + stats count). Single source of truth: service_categories.
 *
 * Coverall carve-out: commercial-cleaning categories never surface publicly —
 * anything with supports_residential = false is excluded. Aliases are
 * excluded (their canonical rows are included).
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
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('service_categories')
      .select('slug, display_name, description, supports_residential, alias_for, priority_order')
      .eq('is_active', true)
      .is('alias_for', null)
      .order('priority_order', { ascending: true, nullsFirst: false });

    if (error || !data) return [];
    return data
      .filter((c) => c.supports_residential !== false)
      .map(({ slug, display_name, description }) => ({ slug, display_name, description }));
  } catch {
    // Components fall back to their static lists when this returns [].
    return [];
  }
}
