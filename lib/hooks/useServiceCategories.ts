'use client'

import { useEffect, useState } from 'react'
import type { ServiceCategory } from '@/lib/types/service-category'

interface UseServiceCategoriesResult {
  categories: ServiceCategory[]
  loading: boolean
  error: string | null
}

let cachedCategories: ServiceCategory[] | null = null
let inflight: Promise<ServiceCategory[]> | null = null

async function fetchServiceCategories(): Promise<ServiceCategory[]> {
  if (cachedCategories) return cachedCategories
  if (inflight) return inflight

  inflight = (async () => {
    const response = await fetch('/api/service-categories')
    if (!response.ok) {
      inflight = null
      throw new Error(`Failed to load service categories (${response.status})`)
    }
    const json = (await response.json()) as { categories: ServiceCategory[] }
    cachedCategories = json.categories ?? []
    inflight = null
    return cachedCategories
  })()

  return inflight
}

/**
 * DLD-458 — DB-hydrated source of truth for service-type dropdowns.
 * Filters out aliases (alias_for !== null) so the legacy `pool_cleaning`
 * and `mobile_car_detailing` rows don't double-render alongside the
 * canonical `pool_service` / `mobile_detailing` slugs.
 */
export function useServiceCategories(): UseServiceCategoriesResult {
  const [categories, setCategories] = useState<ServiceCategory[]>(
    cachedCategories ? cachedCategories.filter((c) => c.alias_for === null) : []
  )
  const [loading, setLoading] = useState(cachedCategories === null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchServiceCategories()
      .then((rows) => {
        if (cancelled) return
        setCategories(rows.filter((c) => c.alias_for === null))
        setLoading(false)
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { categories, loading, error }
}
