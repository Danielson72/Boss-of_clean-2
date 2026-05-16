'use client'

import { useEffect, useMemo, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ServiceCategory } from '@/lib/types/service-category'

interface CategorySelectorProps {
  primary: string | null | undefined
  secondary: string[] | undefined
  onChange: (next: { primary: string | null; secondary: string[] }) => void
  errors?: { primary?: string; secondary?: string }
  disabled?: boolean
}

export default function CategorySelector({
  primary,
  secondary,
  onChange,
  errors,
  disabled,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch('/api/service-categories')
        if (!response.ok) {
          throw new Error('Failed to load categories')
        }
        const result = (await response.json()) as { categories: ServiceCategory[] }
        if (!cancelled) {
          setCategories(result.categories ?? [])
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError('Could not load service categories. Refresh and try again.')
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const safeSecondary = useMemo(() => secondary ?? [], [secondary])

  const handlePrimaryChange = (slug: string) => {
    const cleaned = safeSecondary.filter((s) => s !== slug)
    onChange({ primary: slug, secondary: cleaned })
  }

  const toggleSecondary = (slug: string) => {
    if (slug === primary) return
    const next = safeSecondary.includes(slug)
      ? safeSecondary.filter((s) => s !== slug)
      : [...safeSecondary, slug]
    onChange({ primary: primary ?? null, secondary: next })
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading service categories...
      </div>
    )
  }

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}</p>
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="primary_category" className="text-lg">
          Primary category <span className="text-red-500">*</span>
        </Label>
        <p className="text-sm text-gray-500">
          Your main business. Leads in this category route to you first.
        </p>
        <Select
          value={primary ?? undefined}
          onValueChange={handlePrimaryChange}
          disabled={disabled}
        >
          <SelectTrigger
            id="primary_category"
            className={cn('w-full max-w-md', errors?.primary && 'border-red-500')}
            aria-invalid={!!errors?.primary}
          >
            <SelectValue placeholder="Choose your primary service" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.primary && (
          <p className="text-sm text-red-600">{errors.primary}</p>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-lg">Additional services you offer</Label>
        <p className="text-sm text-gray-500">
          Optional. Pick any other categories you serve — you&apos;ll also see leads
          for these, ranked below your primary.
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const isPrimary = c.slug === primary
            const isSelected = safeSecondary.includes(c.slug)
            return (
              <button
                key={c.slug}
                type="button"
                disabled={disabled || isPrimary}
                onClick={() => toggleSecondary(c.slug)}
                aria-pressed={isSelected}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  isPrimary &&
                    'cursor-not-allowed border-[#FF5F1F]/40 bg-[#FF5F1F]/10 text-[#FF5F1F]',
                  !isPrimary && isSelected &&
                    'border-[#FF5F1F] bg-[#FF5F1F] text-white hover:bg-[#e85410]',
                  !isPrimary && !isSelected &&
                    'border-gray-300 bg-white text-gray-700 hover:border-[#FF5F1F]/60 hover:bg-[#FF5F1F]/5'
                )}
              >
                {c.display_name}
                {isPrimary && (
                  <span className="ml-1 rounded-full bg-[#FF5F1F] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Primary
                  </span>
                )}
                {!isPrimary && isSelected && <X className="h-3 w-3" />}
              </button>
            )
          })}
        </div>
        {errors?.secondary && (
          <p className="text-sm text-red-600">{errors.secondary}</p>
        )}
      </div>
    </div>
  )
}
