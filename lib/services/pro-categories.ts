// DLD-449 — Helpers for persisting a pro's category selection.
//
// Writes `pros.primary_category` (the trigger handles syncing the
// pro_categories.is_primary row) and reconciles secondary rows so the
// join table reflects the canonical [primary, ...secondary] set.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'lib/services/pro-categories' })

export interface CategorySelection {
  primary: string | null
  secondary: string[]
}

export interface PersistCategoriesInput {
  proId: string
  selection: CategorySelection
}

/**
 * Resolve a slug to its canonical form via the DB resolver, returning
 * null for unknown slugs.
 */
export async function resolveCanonicalSlug(
  supabase: SupabaseClient,
  slug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('canonical_service_slug', { p_slug: slug })
    .single<string | null>()
  if (error) {
    logger.error('canonical_service_slug RPC failed', { slug }, error)
    return null
  }
  return data
}

/**
 * Filter a list of slugs to only those that resolve through
 * service_categories. Returns canonical slugs.
 */
export async function normalizeCategorySlugs(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<string[]> {
  if (slugs.length === 0) return []
  const { data, error } = await supabase
    .from('service_categories')
    .select('slug, alias_for')
    .in('slug', slugs)
  if (error) {
    logger.error('normalizeCategorySlugs failed', {}, error)
    return []
  }
  const map = new Map<string, string>()
  for (const row of data ?? []) {
    map.set(row.slug, row.alias_for ?? row.slug)
  }
  return Array.from(
    new Set(slugs.map((s) => map.get(s)).filter((s): s is string => !!s))
  )
}

/**
 * Reconcile pro_categories rows for a pro against the canonical
 * [primary, ...secondary] set. The caller is expected to have already
 * written pros.primary_category (which the DB trigger uses to set
 * is_primary on the join row).
 *
 * RLS-aware — pass a SupabaseClient already authenticated as the pro
 * or as service-role.
 */
export async function reconcileProCategories(
  supabase: SupabaseClient,
  input: PersistCategoriesInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { proId, selection } = input

  const all = await normalizeCategorySlugs(
    supabase,
    [selection.primary, ...selection.secondary].filter(
      (s): s is string => typeof s === 'string' && s.length > 0
    )
  )

  // Insert any rows that don't already exist.
  if (all.length > 0) {
    const upsertPayload = all.map((category) => ({
      pro_id: proId,
      category,
      is_primary: false,
    }))
    const { error: upsertError } = await supabase
      .from('pro_categories')
      .upsert(upsertPayload, {
        onConflict: 'pro_id,category',
        ignoreDuplicates: true,
      })
    if (upsertError) {
      logger.error('Failed to upsert pro_categories rows', { proId }, upsertError)
      return { ok: false, error: 'Failed to save categories' }
    }
  }

  // Delete rows that are no longer in the selection.
  const deleteQuery = supabase.from('pro_categories').delete().eq('pro_id', proId)
  if (all.length > 0) {
    const { error: deleteError } = await deleteQuery.not(
      'category',
      'in',
      `(${all.map((c) => `"${c}"`).join(',')})`
    )
    if (deleteError) {
      logger.error('Failed to prune pro_categories rows', { proId }, deleteError)
      return { ok: false, error: 'Failed to update categories' }
    }
  } else {
    const { error: deleteAllError } = await deleteQuery
    if (deleteAllError) {
      logger.error('Failed to clear pro_categories rows', { proId }, deleteAllError)
      return { ok: false, error: 'Failed to clear categories' }
    }
  }

  return { ok: true }
}
