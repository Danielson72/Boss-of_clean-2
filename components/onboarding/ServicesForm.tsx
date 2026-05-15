'use client'

import { useState } from 'react'
import { StepProps } from './types'
import CategorySelector from './CategorySelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DollarSign, Clock, ArrowRight, ArrowLeft } from 'lucide-react'

export default function ServicesForm({ data, onChange, onNext, onBack, isSubmitting }: StepProps) {
  const [errors, setErrors] = useState<{ primary?: string; hourly_rate?: string }>({})

  const validateForm = () => {
    const newErrors: { primary?: string; hourly_rate?: string } = {}

    if (!data.primary_category) {
      newErrors.primary = 'Choose your primary service category'
    }
    if (!data.hourly_rate || data.hourly_rate < 15) {
      newErrors.hourly_rate = 'Please enter a valid hourly rate (minimum $15)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const handleCategoriesChange = ({
    primary,
    secondary,
  }: {
    primary: string | null
    secondary: string[]
  }) => {
    // Keep legacy services[] in sync with [primary, ...secondary] so the
    // ~30 codepaths still reading pros.services keep working until DLD-444's
    // follow-up sweep drops that column.
    const legacyServices = primary ? [primary, ...secondary] : secondary
    onChange({
      ...data,
      primary_category: primary ?? undefined,
      secondary_categories: secondary,
      services: legacyServices,
    })
    if (errors.primary && primary) {
      setErrors({ ...errors, primary: undefined })
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Services You Offer</h2>
        <p className="text-gray-600 mt-1">
          Pick the categories you serve so leads route to the right Pros, and set your base rate.
        </p>
      </div>

      <CategorySelector
        primary={data.primary_category ?? null}
        secondary={data.secondary_categories ?? []}
        onChange={handleCategoriesChange}
        errors={{ primary: errors.primary }}
        disabled={isSubmitting}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="hourly_rate">Hourly Rate ($) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="hourly_rate"
              type="number"
              min="15"
              max="500"
              step="5"
              value={data.hourly_rate || ''}
              onChange={(e) => {
                onChange({ ...data, hourly_rate: parseFloat(e.target.value) || 0 })
                if (errors.hourly_rate) setErrors({ ...errors, hourly_rate: undefined })
              }}
              placeholder="50"
              className={`pl-10 ${errors.hourly_rate ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.hourly_rate && (
            <p className="text-sm text-red-500">{errors.hourly_rate}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="minimum_hours">Minimum Hours</Label>
          <div className="relative">
            <Clock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <Input
              id="minimum_hours"
              type="number"
              min="1"
              max="8"
              value={data.minimum_hours || 2}
              onChange={(e) => onChange({ ...data, minimum_hours: parseInt(e.target.value) || 2 })}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} disabled={isSubmitting}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
